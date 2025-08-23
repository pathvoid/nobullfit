defmodule NobullfitWeb.UserLive.Settings do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.Sidebar, only: [sidebar: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  on_mount {NobullfitWeb.UserAuth, :require_sudo_mode}

  alias Nobullfit.Accounts

  # Render the settings page with forms for email, password, and account deletion
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} />

      <div class="flex flex-1">
        <.sidebar current_path={@current_path} />

        <div class="flex-1">
          <main class="px-4 py-8 md:py-12">
            <div class="max-w-4xl mx-auto space-y-8">
              <div class="text-center">
                <.header>
                  Account Settings
                  <:subtitle>Manage your account email address and password settings</:subtitle>
                </.header>
              </div>

              <.form for={@email_form} id="email_form" phx-submit="update_email" phx-change="validate_email">
                <.input
                  field={@email_form[:email]}
                  type="email"
                  label="Email"
                  autocomplete="username"
                  required
                />
                <.button variant="primary" phx-disable-with="Changing...">Change Email</.button>
              </.form>

              <div class="divider" />

              <.form
                for={@password_form}
                id="password_form"
                action={~p"/users/update-password"}
                method="post"
                phx-change="validate_password"
                phx-submit="update_password"
                phx-trigger-action={@trigger_submit}
              >
                <input
                  name={@password_form[:email].name}
                  type="hidden"
                  id="hidden_user_email"
                  autocomplete="username"
                  value={@current_email}
                />
                <.input
                  field={@password_form[:password]}
                  type="password"
                  label="New password"
                  autocomplete="new-password"
                  required
                />
                <.input
                  field={@password_form[:password_confirmation]}
                  type="password"
                  label="Confirm new password"
                  autocomplete="new-password"
                />
                <.button variant="primary" phx-disable-with="Saving...">
                  Save Password
                </.button>
              </.form>

              <div class="divider" />

              <div>
                <button
                  class="btn btn-error"
                  phx-click="show_delete_confirm"
                  phx-hook="DeleteAccountHook"
                  id="delete-account-btn"
                >
                  Delete My Account
                </button>
              </div>

              <div class="card bg-info text-info-content">
                <div class="card-body">
                  <h2 class="card-title">Export Your Data</h2>
                  <p class="text-sm">
                    Download all your data as CSV files in a ZIP archive. This includes:
                  </p>
                  <ul class="text-sm list-disc list-inside mb-4">
                    <li>Your profile information</li>
                    <li>All activities and workouts</li>
                    <li>Weight tracking history</li>
                    <li>Food entries and nutrition data</li>
                    <li>Grocery lists and items</li>
                    <li>Saved favorites (foods and recipes)</li>
                  </ul>
                  <p class="text-sm font-semibold mb-4">
                    Your data will be exported excluding sensitive information like passwords.
                  </p>
                  <div class="card-actions justify-end">
                    <a
                      href={~p"/users/export-data"}
                      class="btn btn-info"
                      download
                    >
                      Download My Data
                    </a>
                  </div>
                </div>
              </div>

              <!-- Delete Account Confirmation Modal -->
              <dialog id="delete-account-modal" class="modal">
                <div class="modal-box">
                  <h3 class="font-bold text-lg">Confirm Account Deletion</h3>
                  <p class="py-4">
                    Are you absolutely sure you want to delete your account? This action will:
                  </p>
                  <ul class="list-disc list-inside mb-4 text-sm">
                    <li>Permanently delete your account</li>
                    <li>Remove all your data and progress</li>
                    <li>Log you out immediately</li>
                    <li>Make recovery impossible</li>
                  </ul>
                  <p class="font-semibold text-error mb-4">
                    This action cannot be undone.
                  </p>
                  <div class="modal-action">
                    <form method="dialog">
                      <button class="btn">Cancel</button>
                    </form>
                    <button
                      class="btn btn-error"
                      phx-click="delete_account"
                      phx-disable-with="Deleting..."
                    >
                      Yes, Delete My Account
                    </button>
                  </div>
                </div>
                <form method="dialog" class="modal-backdrop">
                  <button>close</button>
                </form>
              </dialog>
            </div>
          </main>
        </div>
      </div>

      <.footer current_path={@current_path} />
      <.flash_group flash={@flash} />
    </div>
    """
  end

  # Handle email confirmation token mount
  def mount(%{"token" => token}, _session, socket) do
    socket =
      case Accounts.update_user_email(socket.assigns.current_scope.user, token) do
        {:ok, _user} ->
          put_flash(socket, :info, "Email changed successfully.")

        {:error, _} ->
          put_flash(socket, :error, "Email change link is invalid or it has expired.")
      end

    {:ok, push_navigate(socket, to: ~p"/users/settings")}
  end

  # Handle normal mount for settings page
  def mount(_params, session, socket) do
    user = socket.assigns.current_scope.user
    email_changeset = Accounts.change_user_email(user, %{}, validate_unique: false)
    password_changeset = Accounts.change_user_password(user, %{}, hash_password: false)
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})

    socket =
      socket
      |> assign(:current_email, user.email)
      |> assign(:email_form, to_form(email_changeset))
      |> assign(:password_form, to_form(password_changeset))
      |> assign(:trigger_submit, false)
      |> assign(:current_path, "/users/settings")
      |> assign(:maintenance_status, maintenance_status)

    {:ok, socket}
  end

  # Handle email validation event
  def handle_event("validate_email", params, socket) do
    %{"user" => user_params} = params

    email_form =
      socket.assigns.current_scope.user
      |> Accounts.change_user_email(user_params, validate_unique: false)
      |> Map.put(:action, :validate)
      |> to_form()

    {:noreply, assign(socket, email_form: email_form)}
  end

  # Handle email update event
  def handle_event("update_email", params, socket) do
    %{"user" => user_params} = params
    user = socket.assigns.current_scope.user
    true = Accounts.sudo_mode?(user)

    case Accounts.change_user_email(user, user_params) do
      %{valid?: true} = changeset ->
        Accounts.deliver_user_update_email_instructions(
          Ecto.Changeset.apply_action!(changeset, :insert),
          user.email,
          &url(~p"/users/settings/confirm-email/#{&1}")
        )

        info = "A link to confirm your email change has been sent to the new address."
        {:noreply, socket |> put_flash(:info, info)}

      changeset ->
        {:noreply, assign(socket, :email_form, to_form(changeset, action: :insert))}
    end
  end

  # Handle password validation event
  def handle_event("validate_password", params, socket) do
    %{"user" => user_params} = params

    password_form =
      socket.assigns.current_scope.user
      |> Accounts.change_user_password(user_params, hash_password: false)
      |> Map.put(:action, :validate)
      |> to_form()

    {:noreply, assign(socket, password_form: password_form)}
  end

  # Handle password update event
  def handle_event("update_password", params, socket) do
    %{"user" => user_params} = params
    user = socket.assigns.current_scope.user
    true = Accounts.sudo_mode?(user)

    case Accounts.change_user_password(user, user_params) do
      %{valid?: true} = changeset ->
        {:noreply, assign(socket, trigger_submit: true, password_form: to_form(changeset))}

      changeset ->
        {:noreply, assign(socket, password_form: to_form(changeset, action: :insert))}
    end
  end

  # Handle showing the delete account confirmation modal
  def handle_event("show_delete_confirm", _params, socket) do
    {:noreply, push_event(socket, "show_delete_modal", %{})}
  end

  # Handle account deletion event
  def handle_event("delete_account", _params, socket) do
    user = socket.assigns.current_scope.user
    true = Accounts.sudo_mode?(user)

    case Accounts.delete_user(user) do
      {:ok, _deleted_user} ->
        {:noreply,
         socket
         |> put_flash(:info, "Your account has been permanently deleted.")
         |> push_navigate(to: ~p"/")}

      {:error, _} ->
        {:noreply, put_flash(socket, :error, "Failed to delete account. Please try again.")}
    end
  end
end
