defmodule NobullfitWeb.MaintenanceController do
  use NobullfitWeb, :controller

  def show(conn, _params) do
    maintenance_status = conn.assigns.maintenance_status

    conn
    |> put_status(:service_unavailable)
    |> put_layout(false)
    |> render("maintenance.html", maintenance_status: maintenance_status)
  end
end
