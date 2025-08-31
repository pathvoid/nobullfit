defmodule NobullfitWeb.Plugs.UserAgentPlug do
  @moduledoc """
  Plug to capture and store user agent in session for LiveView access.
  """
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    user_agent = get_req_header(conn, "user-agent") |> List.first() || ""

    conn
    |> put_session(:user_agent, user_agent)
  end
end
