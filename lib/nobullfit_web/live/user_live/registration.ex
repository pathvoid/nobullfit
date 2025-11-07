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

            <!-- Honeypot field to catch bots -->
            <input
              type="text"
              name="user[email_confirmation]"
              id="user_email_confirmation"
              autocomplete="off"
              tabindex="-1"
              aria-hidden="true"
              style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;"
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

            <!-- Custom Captcha -->
            <div class="fieldset mb-2">
              <label>
                <span class="label mb-1"><%= @captcha.question %></span>
                <input
                  type="text"
                  name="captcha_answer"
                  id="captcha_answer"
                  value={@captcha.user_answer}
                  class="input input-bordered w-full"
                  placeholder="Enter your answer"
                  required
                />
              </label>
              <%= if @captcha.error do %>
                <p class="mt-1.5 flex gap-2 items-center text-sm text-error">
                  <.icon name="hero-exclamation-circle" class="size-5" />
                  <%= @captcha.error %>
                </p>
              <% end %>
              <button
                type="button"
                phx-click="refresh_captcha"
                class="btn btn-ghost btn-sm mt-2 mb-4 self-start"
                title="Get a new question"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                New question
              </button>
            </div>

            <.button phx-disable-with="Creating account..." class="btn btn-primary w-full">
              Create an account
            </.button>
          </.form>
        </div>
      </main>

      <.footer current_path={@current_path} user_agent={@user_agent} />
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
      captcha = generate_captcha()
      {:ok, assign_form(socket, changeset, maintenance_status, user_agent, captcha), temporary_assigns: [form: nil]}
    end
  end

  # Handle registration form submission
  def handle_event("save", params, socket) do
    user_params = Map.get(params, "user", %{})
    captcha_answer = Map.get(params, "captcha_answer", "")

    # Check honeypot field - if filled, it's a bot
    honeypot_value = Map.get(user_params, "email_confirmation", "")

    if honeypot_value != nil and honeypot_value != "" do
      # Bot detected - silently reject but make it look successful
      email = Map.get(user_params, "email", "your email")
      {:noreply,
        socket
        |> put_flash(
          :info,
          "An email was sent to #{email}, please access it to confirm your account."
        )
        |> push_navigate(to: ~p"/users/log-in")}
    else
      # Validate captcha
      captcha_valid = validate_captcha_answer(captcha_answer, socket.assigns.captcha.answer)

      if not captcha_valid do
        # Captcha failed - generate new one and show error
        new_captcha = generate_captcha()
        {:noreply,
          socket
          |> assign(captcha: %{new_captcha | user_answer: captcha_answer, error: "Incorrect answer. Please try again."})}
      else
        # Captcha passed - proceed with registration
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
              # Send confirmation email for web users during registration
              {:ok, _} =
                Accounts.deliver_confirmation_instructions(
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
            new_captcha = generate_captcha()
            {:noreply, assign_form(socket, changeset, socket.assigns.maintenance_status, socket.assigns.user_agent, new_captcha)}
        end
      end
    end
  end

  # Handle captcha refresh
  def handle_event("refresh_captcha", _params, socket) do
    new_captcha = generate_captcha()
    {:noreply, assign(socket, captcha: new_captcha)}
  end

  # Handle form validation
  def handle_event("validate", %{"user" => user_params}, socket) do
    changeset = Accounts.change_user_registration(%User{}, user_params, hash_password: false)
    {:noreply, assign_form(socket, Map.put(changeset, :action, :validate), socket.assigns.maintenance_status, socket.assigns.user_agent, socket.assigns.captcha)}
  end

  # Assign form and other assigns to socket
  defp assign_form(socket, %Ecto.Changeset{} = changeset, maintenance_status, user_agent, captcha) do
    form = to_form(changeset, as: "user")
    assign(socket, form: form, current_path: "/users/register", maintenance_status: maintenance_status, user_agent: user_agent, captcha: captcha)
  end

  # Generate a random math captcha
  defp generate_captcha do
    # Generate two random numbers between 1 and 10
    num1 = :rand.uniform(10)
    num2 = :rand.uniform(10)

    # Randomly choose addition or subtraction
    operation = if :rand.uniform(2) == 1, do: :add, else: :subtract

    {question, answer} = case operation do
      :add ->
        {"What is #{num1} + #{num2}?", num1 + num2}
      :subtract ->
        # Ensure positive result
        {larger, smaller} = if num1 >= num2, do: {num1, num2}, else: {num2, num1}
        {"What is #{larger} - #{smaller}?", larger - smaller}
    end

    %{
      question: question,
      answer: answer,
      user_answer: "",
      error: nil
    }
  end

  # Validate captcha answer
  defp validate_captcha_answer(user_answer, correct_answer) when is_binary(user_answer) do
    case Integer.parse(String.trim(user_answer)) do
      {parsed_answer, _} -> parsed_answer == correct_answer
      :error -> false
    end
  end

  defp validate_captcha_answer(_, _), do: false
end
