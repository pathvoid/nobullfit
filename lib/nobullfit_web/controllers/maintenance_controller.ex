defmodule NobullfitWeb.MaintenanceController do
  use NobullfitWeb, :controller

  def show(conn, _params) do
    maintenance_status = conn.assigns.maintenance_status
    user_agent = get_req_header(conn, "user-agent") |> List.first() || ""

    conn
    |> put_status(:service_unavailable)
    |> put_layout(false)
    |> render("maintenance.html",
      maintenance_status: maintenance_status,
      current_path: "/maintenance",
      user_agent: user_agent
    )
  end
end
