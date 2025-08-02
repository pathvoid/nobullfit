defmodule NobullfitWeb.Plugs.TimezonePlug do
  @moduledoc """
  Plug to detect and store user timezone in session.
  """
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    # Check if timezone is already in session
    case get_session(conn, "user_timezone") do
      nil ->
        # Try to get timezone and local date from query params (sent by JavaScript)
        timezone = conn.params["timezone"] || "UTC"
        local_date = conn.params["local_date"]

        # Store in both atom and string keys for compatibility
        conn = conn |> put_session(:user_timezone, timezone)
        conn = conn |> put_session("user_timezone", timezone)

        # If we have a local date, also store it
        conn = if local_date do
          conn |> put_session(:user_local_date, local_date)
          conn |> put_session("user_local_date", local_date)
        else
          conn
        end

        conn |> put_resp_header("x-timezone-set", "true")

      _timezone ->
        # Timezone already in session, no need to change
        conn
    end
  end
end
