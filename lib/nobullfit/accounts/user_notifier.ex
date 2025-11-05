defmodule Nobullfit.Accounts.UserNotifier do
  import Swoosh.Email

  alias Nobullfit.Mailer
  alias Nobullfit.Accounts.User

  # Delivers the email using the application mailer.
  defp deliver(recipient, subject, body) do
    email =
      new()
      |> to(recipient)
      |> from({"Nobullfit", "support@nobull.fit"})
      |> subject(subject)
      |> text_body(body)

    with {:ok, _metadata} <- Mailer.deliver(email) do
      {:ok, email}
    end
  end

  @doc """
  Deliver instructions to update a user email.
  """
  def deliver_update_email_instructions(user, url) do
    deliver(user.email, "Update email instructions", """

    ==============================

    Hi #{user.email},

    You can change your email by visiting the URL below:

    #{url}

    If you didn't request this change, please ignore this.

    ==============================
    """)
  end

  @doc """
  Deliver instructions to log in with a magic link.

  Only sends email if the user is confirmed. Unconfirmed users will not receive
  any email to prevent spam attacks where malicious users create accounts with
  emails that don't belong to them.
  """
  def deliver_login_instructions(user, url) do
    case user do
      %User{confirmed_at: nil} ->
        # Don't send any email for unconfirmed users to prevent spam
        {:ok, nil}
      _ -> deliver_magic_link_instructions(user, url)
    end
  end

  @doc """
  Deliver confirmation instructions to a newly registered user.

  This should only be called during registration, not during login attempts.
  """
  def deliver_confirmation_instructions(user, url) do
    deliver(user.email, "Confirmation instructions", """

    ==============================

    Hi #{user.email},

    You can confirm your account by visiting the URL below:

    #{url}

    If you didn't create an account with us, please ignore this.

    ==============================
    """)
  end

  defp deliver_magic_link_instructions(user, url) do
    deliver(user.email, "Log in instructions", """

    ==============================

    Hi #{user.email},

    You can log into your account by visiting the URL below:

    #{url}

    If you didn't request this email, please ignore this.

    ==============================
    """)
  end
end
