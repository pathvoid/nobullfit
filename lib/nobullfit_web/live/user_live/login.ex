defmodule NobullfitWeb.UserLive.Login do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]
  import NobullfitWeb.Helpers.AppDetection, only: [is_nobullfit_app?: 1]

  alias Nobullfit.Accounts

  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} user_agent={@user_agent} />

      <main class="container mx-auto px-4 py-8 md:py-24 flex-1">
        <div class="mx-auto max-w-sm space-y-4">
          <div class="text-center">
            <.header>
              <p>Log in</p>
              <:subtitle>
                <%= if @current_scope do %>
                  You need to reauthenticate to perform sensitive actions on your account.
                <% else %>
                  Don't have an account? <.link
                    navigate={~p"/users/register"}
                    class="font-semibold text-brand hover:underline"
                    phx-no-format
                  >Sign up</.link> for an account now.
                <% end %>
              </:subtitle>
            </.header>
          </div>

          <div :if={local_mail_adapter?() and not is_nobullfit_app?(@user_agent)} class="alert alert-info">
            <.icon name="hero-information-circle" class="size-6 shrink-0" />
            <div>
              <p>You are running the local mail adapter.</p>
              <p>
                To see sent emails, visit <.link href="/dev/mailbox" class="underline">the mailbox page</.link>.
              </p>
            </div>
          </div>

          <%= if is_nobullfit_app?(@user_agent) do %>
            <!-- App users: Password-only login -->
            <.form
              :let={f}
              for={@form}
              id="login_form_password"
              action={~p"/users/log-in"}
              phx-submit="submit_password"
              phx-trigger-action={@trigger_submit}
            >
              <.input
                readonly={!!@current_scope}
                field={f[:email]}
                type="email"
                label="Email"
                autocomplete="username"
                required
                phx-mounted={JS.focus()}
              />
              <.input
                field={@form[:password]}
                type="password"
                label="Password"
                autocomplete="current-password"
                required
              />
              <.button class="btn btn-primary w-full" name={@form[:remember_me].name} value="true">
                Log in <span aria-hidden="true">→</span>
              </.button>
            </.form>
          <% else %>
            <!-- Web users: Magic link + password login -->
            <.form
              :let={f}
              for={@form}
              id="login_form_magic"
              action={~p"/users/log-in"}
              phx-submit="submit_magic"
            >
              <.input
                readonly={!!@current_scope}
                field={f[:email]}
                type="email"
                label="Email"
                autocomplete="username"
                required
                phx-mounted={JS.focus()}
              />
              <.button class="btn btn-primary w-full">
                Log in with email <span aria-hidden="true">→</span>
              </.button>
            </.form>

            <div class="divider">or</div>

            <.form
              :let={f}
              for={@form}
              id="login_form_password"
              action={~p"/users/log-in"}
              phx-submit="submit_password"
              phx-trigger-action={@trigger_submit}
            >
              <.input
                readonly={!!@current_scope}
                field={f[:email]}
                type="email"
                label="Email"
                autocomplete="username"
                required
              />
              <.input
                field={@form[:password]}
                type="password"
                label="Password"
                autocomplete="current-password"
              />
              <.button class="btn btn-primary w-full" name={@form[:remember_me].name} value="true">
                Log in and stay logged in <span aria-hidden="true">→</span>
              </.button>
              <.button class="btn btn-primary btn-soft w-full mt-2">
                Log in only this time
              </.button>
            </.form>
          <% end %>
        </div>
      </main>

      <.footer current_path={@current_path} />
      <.flash_group flash={@flash} />
    </div>
    """
  end

  def mount(_params, session, socket) do
    email =
      Phoenix.Flash.get(socket.assigns.flash, :email) ||
        get_in(socket.assigns, [:current_scope, Access.key(:user), Access.key(:email)])

    form = to_form(%{"email" => email}, as: "user")
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})
    user_agent = Map.get(session, "user_agent", "") || Map.get(session, :user_agent, "")

    # Check if maintenance mode is enabled and login is blocked
    if maintenance_status.enabled && maintenance_status.prevent_login do
      {:ok, redirect(socket, to: ~p"/maintenance")}
    else
      {:ok,
       assign(socket,
         form: form,
         trigger_submit: false,
         current_path: "/users/log-in",
         maintenance_status: maintenance_status,
         user_agent: user_agent
       )}
    end
  end

  def handle_event("submit_password", _params, socket) do
    {:noreply, assign(socket, :trigger_submit, true)}
  end

  def handle_event("submit_magic", %{"user" => %{"email" => email}}, socket) do
    if user = Accounts.get_user_by_email(email) do
      Accounts.deliver_login_instructions(
        user,
        &url(~p"/users/log-in/#{&1}")
      )
    end

    info =
      "If your email is in our system, you will receive instructions for logging in shortly."

    {:noreply,
     socket
     |> put_flash(:info, info)
     |> push_navigate(to: ~p"/users/log-in")}
  end

  defp local_mail_adapter? do
    Application.get_env(:nobullfit, Nobullfit.Mailer)[:adapter] == Swoosh.Adapters.Local
  end
end
