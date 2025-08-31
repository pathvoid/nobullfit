defmodule NobullfitWeb.UserLive.Registration do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]
  import NobullfitWeb.Helpers.AppDetection, only: [is_nobullfit_app?: 1]

  alias Nobullfit.Accounts
  alias Nobullfit.Accounts.User

  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} user_agent={@user_agent} />

      <main class="container mx-auto px-4 py-8 md:py-24 flex-1">
        <div class="mx-auto max-w-sm">
          <div class="text-center">
            <.header>
              Register for an account
              <:subtitle>
                <%= if is_nobullfit_app?(@user_agent) do %>
                  Set a password to log in directly from the app.
                <% else %>
                  Already registered?
                  <.link navigate={~p"/users/log-in"} class="font-semibold text-brand hover:underline">
                    Log in
                  </.link>
                  to your account now.
                <% end %>
              </:subtitle>
            </.header>
          </div>

          <.form for={@form} id="registration_form" phx-submit="save" phx-change="validate">
            <.input
              field={@form[:email]}
              type="email"
              label="Email"
              autocomplete="username"
              required
              phx-mounted={JS.focus()}
            />

            <%= if is_nobullfit_app?(@user_agent) do %>
              <.input
                field={@form[:password]}
                type="password"
                label="Password"
                autocomplete="new-password"
                required
              />
              <.input
                field={@form[:password_confirmation]}
                type="password"
                label="Confirm Password"
                autocomplete="new-password"
                required
              />
            <% end %>

            <.button phx-disable-with="Creating account..." class="btn btn-primary w-full">
              Create an account
            </.button>
          </.form>
        </div>
      </main>

      <.footer current_path={@current_path} />
      <.flash_group flash={@flash} />
    </div>
    """
  end

  # Redirect if user is already signed in
  def mount(_params, _session, %{assigns: %{current_scope: %{user: user}}} = socket)
      when not is_nil(user) do
    {:ok, redirect(socket, to: NobullfitWeb.UserAuth.signed_in_path(socket))}
  end

  # Mount registration page, handle maintenance mode
  def mount(_params, session, socket) do
    changeset = Accounts.change_user_registration(%User{})
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})
    user_agent = Map.get(session, "user_agent", "") || Map.get(session, :user_agent, "")

    # Check if maintenance mode is enabled and registration is blocked
    if maintenance_status.enabled && maintenance_status.prevent_registration do
      {:ok, redirect(socket, to: ~p"/maintenance")}
    else
      {:ok, assign_form(socket, changeset, maintenance_status, user_agent), temporary_assigns: [form: nil]}
    end
  end

  # Handle registration form submission
  def handle_event("save", %{"user" => user_params}, socket) do
    case Accounts.register_user_with_password(user_params) do
      {:ok, user} ->
        # If password was provided (app user), don't send magic link
        if Map.has_key?(user_params, "password") and user_params["password"] != "" do
          {:noreply,
            socket
            |> put_flash(
              :info,
              "Account created successfully! You can now log in with your email and password."
            )
            |> push_navigate(to: ~p"/users/log-in")}
        else
          # Send magic link for web users
          {:ok, _} =
            Accounts.deliver_login_instructions(
              user,
              &url(~p"/users/log-in/#{&1}")
            )

          {:noreply,
            socket
            |> put_flash(
              :info,
              "An email was sent to #{user.email}, please access it to confirm your account."
            )
            |> push_navigate(to: ~p"/users/log-in")}
        end

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign_form(socket, changeset, socket.assigns.maintenance_status, socket.assigns.user_agent)}
    end
  end

  # Handle form validation
  def handle_event("validate", %{"user" => user_params}, socket) do
    changeset = Accounts.change_user_registration(%User{}, user_params, hash_password: false)
    {:noreply, assign_form(socket, Map.put(changeset, :action, :validate), socket.assigns.maintenance_status, socket.assigns.user_agent)}
  end

  # Assign form and other assigns to socket
  defp assign_form(socket, %Ecto.Changeset{} = changeset, maintenance_status, user_agent) do
    form = to_form(changeset, as: "user")
    assign(socket, form: form, current_path: "/users/register", maintenance_status: maintenance_status, user_agent: user_agent)
  end
end
