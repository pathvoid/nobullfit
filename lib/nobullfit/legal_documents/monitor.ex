defmodule Nobullfit.LegalDocuments.Monitor do
  @moduledoc """
  A GenServer that monitors legal documents for changes and automatically
  updates the database and sends notifications when changes are detected.
  """

  use GenServer
  require Logger
  alias Nobullfit.LegalDocuments

  @check_interval 60_000 # Check every minute

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    # Get configuration
    enabled = Application.get_env(:nobullfit, :legal_documents_monitor)[:enabled] || true
    check_interval = Application.get_env(:nobullfit, :legal_documents_monitor)[:check_interval] || @check_interval

    if enabled do
      Logger.info("Legal Documents Monitor started - checking every #{check_interval}ms")

      # Schedule the first check
      schedule_check(check_interval)

      {:ok, %{check_interval: check_interval, enabled: true}}
    else
      Logger.info("Legal Documents Monitor disabled")
      {:ok, %{check_interval: check_interval, enabled: false}}
    end
  end

  @impl true
  def handle_info(:check_documents, state) do
    if state.enabled do
      check_all_documents()

      # Schedule the next check
      schedule_check(state.check_interval)
    end

    {:noreply, state}
  end

  @impl true
  def handle_call(:check_documents, _from, state) do
    result = check_all_documents()
    {:reply, result, state}
  end

  defp schedule_check(interval) do
    Process.send_after(self(), :check_documents, interval)
  end

  defp check_all_documents do
    documents = ["privacy_policy", "terms_of_service"]

    Enum.map(documents, fn document_type ->
      case check_document(document_type) do
        {:ok, :updated} ->
          Logger.info("Legal document #{document_type} was updated and notifications sent")
          {:ok, document_type}

        {:ok, :no_change} ->
          {:ok, document_type}

        {:error, reason} ->
          Logger.error("Error checking #{document_type}: #{inspect(reason)}")
          {:error, {document_type, reason}}
      end
    end)
  end

  defp check_document(document_type) do
    case LegalDocuments.read_document(document_type) do
      {:ok, content} ->
        content_hash = LegalDocuments.calculate_content_hash(content)

        case LegalDocuments.get_active_version(document_type) do
          nil ->
            Logger.info("No active version found for #{document_type}, creating initial version")
            # No version exists yet, create initial version
            create_initial_version(document_type, content, content_hash)

          current_version ->
            if current_version.content_hash != content_hash do
              Logger.info("Content hash changed for #{document_type}, creating new version")
              # Content has changed, create new version
              create_new_version(document_type, content, content_hash)
            else
              {:ok, :no_change}
            end
        end

      {:error, :not_found} ->
        Logger.warning("Legal document file not found: #{document_type}")
        {:error, :file_not_found}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp create_initial_version(document_type, content, _content_hash) do
    # Extract version from content or use current date
    version = extract_version_from_content(content) || Date.utc_today() |> Date.to_string()
    effective_date = Date.utc_today()

    case LegalDocuments.update_document(document_type, version, effective_date) do
      {:ok, _new_version} ->
        Logger.info("Created initial version for #{document_type}: #{version}")
        {:ok, :updated}

      {:error, changeset} ->
        Logger.error("Failed to create initial version for #{document_type}: #{inspect(changeset.errors)}")
        {:error, changeset}
    end
  end

  defp create_new_version(document_type, _content, _content_hash) do
    # Generate a new version based on current timestamp
    version = generate_new_version()
    effective_date = Date.utc_today()

    case LegalDocuments.update_document(document_type, version, effective_date) do
      {:ok, _new_version} ->
        Logger.info("Created new version for #{document_type}: #{version}")
        {:ok, :updated}

      {:error, changeset} ->
        Logger.error("Failed to create new version for #{document_type}: #{inspect(changeset.errors)}")
        {:error, changeset}
    end
  end

  defp extract_version_from_content(content) do
    # Look for "Effective Date: YYYY-MM-DD" pattern (with or without ####)
    case Regex.run(~r/Effective Date:\s*(\d{4}-\d{2}-\d{2})/i, content) do
      [_, date_string] -> date_string
      nil -> nil
    end
  end

  defp generate_new_version do
    # Generate a unique version based on current timestamp
    DateTime.utc_now()
    |> DateTime.to_string()
    |> String.replace(" ", "T")
    |> String.replace(":", "-")
    |> String.slice(0, 19) # YYYY-MM-DDTHH-MM-SS format
  end

  # Public API
  def check_documents do
    GenServer.call(__MODULE__, :check_documents)
  end

  def check_documents_async do
    GenServer.cast(__MODULE__, :check_documents)
  end
end
