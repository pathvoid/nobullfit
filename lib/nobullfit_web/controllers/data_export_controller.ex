defmodule NobullfitWeb.DataExportController do
  use NobullfitWeb, :controller

  alias Nobullfit.DataExport
  alias Nobullfit.Accounts

  # Require sudo mode for data export
  plug :require_sudo_mode

  @doc """
  Exports user data as a ZIP file containing CSV files.
  """
  def export_data(conn, _params) do
    user = conn.assigns.current_scope.user

    case DataExport.create_export_zip(user.id) do
      {:ok, zip_binary} ->
        # Generate filename with timestamp
        timestamp = Calendar.strftime(DateTime.utc_now(), "%Y%m%d_%H%M%S")
        filename = "nobullfit_data_export_#{timestamp}.zip"

        conn
        |> put_resp_content_type("application/zip")
        |> put_resp_header("content-disposition", "attachment; filename=\"#{filename}\"")
        |> send_resp(200, zip_binary)

      {:error, _reason} ->
        conn
        |> put_flash(:error, "Failed to generate data export. Please try again.")
        |> redirect(to: ~p"/users/settings")
    end
  end

  # Private functions

  defp require_sudo_mode(conn, _opts) do
    user = conn.assigns.current_scope.user

    if Accounts.sudo_mode?(user) do
      conn
    else
      conn
      |> put_flash(:error, "Sudo mode required for data export.")
      |> redirect(to: ~p"/users/settings")
      |> halt()
    end
  end
end
