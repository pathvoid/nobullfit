defmodule NobullfitWeb.MaintenanceControllerTest do
  use NobullfitWeb.ConnCase, async: true
  alias Nobullfit.MaintenanceHelper

  describe "GET /maintenance" do
    test "renders maintenance page when maintenance mode is enabled", %{conn: conn} do
      # Enable maintenance mode
      {:ok, _setting} = MaintenanceHelper.enable("System maintenance in progress")

      conn = get(conn, ~p"/maintenance")
      assert html_response(conn, 503)
      assert conn.assigns.maintenance_status.enabled == true
      assert conn.assigns.maintenance_status.message == "System maintenance in progress"
    end

    test "renders maintenance page with default message when no custom message is set", %{conn: conn} do
      # Enable maintenance mode without custom message
      {:ok, _setting} = MaintenanceHelper.enable()

      conn = get(conn, ~p"/maintenance")
      assert html_response(conn, 503)
      assert conn.assigns.maintenance_status.enabled == true
      assert conn.assigns.maintenance_status.message == nil
    end

    test "renders maintenance page with restrictions enabled", %{conn: conn} do
      # Enable maintenance mode with restrictions
      {:ok, _setting} = MaintenanceHelper.enable("Database migration",
        prevent_login: true,
        prevent_registration: true
      )

      conn = get(conn, ~p"/maintenance")
      assert html_response(conn, 503)
      assert conn.assigns.maintenance_status.enabled == true
      assert conn.assigns.maintenance_status.prevent_login == true
      assert conn.assigns.maintenance_status.prevent_registration == true
    end
  end
end
