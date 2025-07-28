defmodule NobullfitWeb.Plugs.MaintenancePlug do
  import Plug.Conn
  import Phoenix.Controller
  use NobullfitWeb, :verified_routes
  alias Nobullfit.MaintenanceSetting

  @doc """
  Fetches the current maintenance status and assigns it to the connection.
  """
  def fetch_maintenance_status(conn, _opts) do
    maintenance_status = MaintenanceSetting.get_maintenance_status()
    conn
    |> assign(:maintenance_status, maintenance_status)
    |> put_session(:maintenance_status, maintenance_status)
  end

  @doc """
  Checks if maintenance mode is enabled and applies restrictions.
  """
  def check_maintenance_restrictions(conn, _opts) do
    maintenance_status = MaintenanceSetting.get_maintenance_status()

    if maintenance_status.enabled do
      # Check if user is trying to access restricted routes
      if should_block_request?(conn, maintenance_status) do
        conn
        |> redirect(to: ~p"/maintenance")
        |> halt()
      else
        conn
      end
    else
      conn
    end
  end

  defp should_block_request?(conn, maintenance_status) do
    path = conn.request_path

    # Block login if prevent_login is enabled
    if maintenance_status.prevent_login && String.starts_with?(path, "/users/log-in") do
      true
    # Block registration if prevent_registration is enabled
    else
      if maintenance_status.prevent_registration && String.starts_with?(path, "/users/register") do
        true
      else
        false
      end
    end
  end
end
