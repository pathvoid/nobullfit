defmodule Nobullfit.LegalDocuments do
  @moduledoc """
  The LegalDocuments context handles legal document management, version tracking,
  and user notifications for document updates.
  """

  import Ecto.Query, warn: false
  require Logger
  alias Nobullfit.Repo
  alias Nobullfit.LegalDocuments.{LegalDocumentVersion, LegalDocumentNotification}
  alias Nobullfit.Accounts.User
  alias Nobullfit.Mailer

  @doc """
  Returns the current active version of a legal document.
  """
  def get_active_version(document_type) do
    Repo.get_by(LegalDocumentVersion, document_type: document_type, is_active: true)
  end

  @doc """
  Returns a specific version of a legal document.
  """
  def get_version(document_type, version) do
    Repo.get_by(LegalDocumentVersion, document_type: document_type, version: version)
  end

  @doc """
  Returns all versions of a legal document.
  """
  def list_versions(document_type) do
    Repo.all(
      from v in LegalDocumentVersion,
        where: v.document_type == ^document_type,
        order_by: [desc: v.effective_date]
    )
  end

  @doc """
  Creates a new legal document version.
  """
  def create_version(attrs \\ %{}) do
    %LegalDocumentVersion{}
    |> LegalDocumentVersion.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a legal document version.
  """
  def update_version(%LegalDocumentVersion{} = version, attrs) do
    version
    |> LegalDocumentVersion.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deactivates all versions of a document type except the specified one.
  """
  def activate_version(document_type, version) do
    Repo.transact(fn ->
      # Deactivate all versions of this document type
      Repo.update_all(
        from(v in LegalDocumentVersion, where: v.document_type == ^document_type),
        set: [is_active: false]
      )

      # Activate the specified version
      Repo.update_all(
        from(
          v in LegalDocumentVersion,
          where: v.document_type == ^document_type and v.version == ^version
        ),
        set: [is_active: true]
      )
    end)
  end

  @doc """
  Checks if a user has been notified about a specific document version.
  """
  def user_notified?(user_id, document_type, version) do
    Repo.exists?(
      from n in LegalDocumentNotification,
        where:
          n.user_id == ^user_id and n.document_type == ^document_type and
            n.version == ^version
    )
  end

  @doc """
  Marks a user as notified about a document version.
  """
  def mark_user_notified(user_id, document_type, version) do
    %LegalDocumentNotification{}
    |> LegalDocumentNotification.changeset(%{
      user_id: user_id,
      document_type: document_type,
      version: version,
      notified_at: DateTime.utc_now()
    })
    |> Repo.insert()
  end

  @doc """
  Returns all users who haven't been notified about a specific document version.
  Excludes users who registered after the document version was created.
  """
  def get_unnotified_users(document_type, version) do
    # Get the document version to check when it was created
    case get_version(document_type, version) do
      nil ->
        # If version doesn't exist, return empty list
        []

      document_version ->
        # Get all users who haven't been notified about this version
        notified_user_ids =
          Repo.all(
            from n in LegalDocumentNotification,
              where: n.document_type == ^document_type and n.version == ^version,
              select: n.user_id
          )

        # Get users who registered before the document version was created
        # and haven't been notified about this version
        Repo.all(
          from u in User,
            where:
              u.id not in ^notified_user_ids and
                u.inserted_at < ^document_version.inserted_at
        )
    end
  end

  @doc """
  Reads a legal document from markdown file.
  """
  def read_document(document_type) do
    # Use absolute path to avoid any caching issues
    base_path = File.cwd!()
    file_path = Path.join([base_path, "priv", "legal_documents", "#{document_type}.md"])

    # Force a fresh read by using File.stream! and collecting all lines
    try do
      content =
        File.stream!(file_path)
        |> Enum.to_list()
        |> Enum.join("")

      {:ok, content}
    rescue
      File.Error -> {:error, :not_found}
      e -> {:error, e}
    end
  end

  @doc """
  Calculates SHA256 hash of content for change detection.
  """
  def calculate_content_hash(content) do
    :crypto.hash(:sha256, content) |> Base.encode16(case: :lower)
  end

  @doc """
  Checks if a document has changed by comparing content hash.
  """
  def document_changed?(document_type, content) do
    current_hash = calculate_content_hash(content)

    case get_active_version(document_type) do
      nil -> true # No previous version exists
      version -> version.content_hash != current_hash
    end
  end

  @doc """
  Updates a legal document and notifies users of changes.
  """
  def update_document(document_type, version, effective_date) do
    case read_document(document_type) do
      {:ok, content} ->
        content_hash = calculate_content_hash(content)

        Repo.transact(fn ->
          # Create new version
          case create_version(%{
                 document_type: document_type,
                 version: version,
                 content_hash: content_hash,
                 effective_date: effective_date,
                 is_active: true
               }) do
            {:ok, new_version} ->
              # Deactivate old versions
              Repo.update_all(
                from(
                  v in LegalDocumentVersion,
                  where: v.document_type == ^document_type and v.id != ^new_version.id
                ),
                set: [is_active: false]
              )

              # Notify users
              notify_users_of_update(document_type, version, content)

              {:ok, new_version}

            {:error, changeset} ->
              Repo.rollback(changeset)
          end
        end)

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc """
  Sends email notifications to all users about a document update.
  """
  def notify_users_of_update(document_type, version, _content) do
    users = get_unnotified_users(document_type, version)

    Enum.each(users, fn user ->
      case send_document_update_email(user, document_type, version) do
        {:ok, _email} ->
          mark_user_notified(user.id, document_type, version)

        {:error, reason} ->
          # Log the error but don't mark as notified so we can retry later
          Logger.error(
            "Failed to send legal document update email to #{user.email}: #{inspect(reason)}"
          )
      end
    end)
  end

  @doc """
  Sends an email to a user about a document update.
  """
  def send_document_update_email(user, document_type, version) do
    document_name =
      case document_type do
        "privacy_policy" -> "Privacy Policy"
        "terms_of_service" -> "Terms of Service"
        _ -> String.replace(document_type, "_", " ") |> String.capitalize()
      end

    # Format version to show only the date part (YYYY-MM-DD)
    formatted_version =
      case String.split(version, "T") do
        [date, _time] -> date
        [date] -> date
        _ -> version
      end

    # Use the same deliver function as other emails for consistency
    deliver(
      user.email,
      "NoBullFit #{document_name} Updated",
      """

      ==============================

      Hi #{user.email},

      We've updated our #{document_name} (version #{formatted_version}). As a privacy-first platform, we believe in full transparency about any changes to our legal documents.

      You can review the updated #{document_name} at:

      https://nobull.fit/#{document_type}

      If you have any questions about these changes, please contact us at support@nobull.fit

      Thank you for using NoBullFit!

      ==============================
      """
    )
  end

  # Delivers the email using the application mailer (same as user_notifier.ex)
  defp deliver(recipient, subject, body) do
    email =
      Swoosh.Email.new()
      |> Swoosh.Email.to(recipient)
      |> Swoosh.Email.from({"Nobullfit", "support@nobull.fit"})
      |> Swoosh.Email.subject(subject)
      |> Swoosh.Email.text_body(body)

    with {:ok, _metadata} <- Mailer.deliver(email) do
      {:ok, email}
    end
  end

  @doc """
  Converts markdown content to HTML for display with proper spacing.
  """
  def markdown_to_html(markdown) do
    # Simple markdown to HTML conversion with improved spacing
    markdown
    |> String.replace(~r/^#### (.+)$/m, "<h4 class=\"text-lg font-semibold mt-6 mb-4\">\\1</h4>")
    |> String.replace(~r/^### (.+)$/m, "<h3 class=\"text-xl font-medium mt-8 mb-3\">\\1</h3>")
    |> String.replace(
      ~r/^## (.+)$/m,
      "<h2 class=\"text-2xl font-semibold mb-4\" style=\"margin-top: 2rem !important;\">\\1</h2>"
    )
    |> String.replace(~r/^# (.+)$/m, "<h1 class=\"text-4xl font-bold mt-16 mb-6\">\\1</h1>")
    |> String.replace(~r/\*\*(.+?)\*\*/s, "<strong>\\1</strong>")
    |> String.replace(~r/\*(.+?)\*/s, "<em>\\1</em>")
    |> String.replace(
      ~r/\[(.+?)\]\((.+?)\)/s,
      "<a href=\"\\2\" class=\"link link-primary\">\\1</a>"
    )
    |> String.replace(
      ~r/\n\n/m,
      "</p><p class=\"text-base-content/70 leading-relaxed mb-4\">"
    )
    |> then(fn content ->
      "<p class=\"text-base-content/70 leading-relaxed mb-4\">#{content}</p>"
    end)
    |> String.replace("<p class=\"text-base-content/70 leading-relaxed mb-4\"></p>", "")
    |> String.replace("<p class=\"text-base-content/70 leading-relaxed mb-4\"><h1", "<h1")
    |> String.replace("<p class=\"text-base-content/70 leading-relaxed mb-4\"><h2", "<h2")
    |> String.replace("<p class=\"text-base-content/70 leading-relaxed mb-4\"><h3", "<h3")
    |> String.replace("<p class=\"text-base-content/70 leading-relaxed mb-4\"><h4", "<h4")
    |> String.replace("</h1></p>", "</h1>")
    |> String.replace("</h2></p>", "</h2>")
    |> String.replace("</h3></p>", "</h3>")
    |> String.replace("</h4></p>", "</h4>")
    |> String.replace("</h1>", "</h1><div class=\"mb-4\"></div>")
    |> String.replace("</h2>", "</h2><div class=\"mb-3\"></div>")
    |> String.replace("</h3>", "</h3><div class=\"mb-2\"></div>")
    |> String.replace("</h4>", "</h4><div class=\"mb-2\"></div>")
  end
end
