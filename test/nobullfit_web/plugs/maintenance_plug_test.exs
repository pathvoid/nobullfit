defmodule NobullfitWeb.Plugs.MaintenancePlugTest do
  use NobullfitWeb.ConnCase, async: true
  alias NobullfitWeb.Plugs.MaintenancePlug
  alias Nobullfit.MaintenanceHelper

  setup do
    # Ensure maintenance is disabled before each test
    MaintenanceHelper.disable()
    :ok
  end

  # Note: fetch_maintenance_status tests are skipped due to session dependency
  # The core functionality is tested through the restriction tests below

  describe "check_maintenance_restrictions/2" do
    test "allows normal requests when maintenance is disabled" do
      # Ensure maintenance is disabled
      MaintenanceHelper.disable()

      conn = build_conn()
      conn = MaintenancePlug.check_maintenance_restrictions(conn, [])

      refute conn.halted
    end

    test "allows normal requests when maintenance is enabled but no restrictions" do
      # Enable maintenance without restrictions
      {:ok, _setting} = MaintenanceHelper.enable("Test maintenance")

      conn = build_conn()
      conn = MaintenancePlug.check_maintenance_restrictions(conn, [])

      refute conn.halted
    end

    test "blocks login requests when prevent_login is enabled" do
      # Enable maintenance with login prevention
      {:ok, _setting} = MaintenanceHelper.enable("Test maintenance", prevent_login: true)

      conn = build_conn()
      conn = put_req_header(conn, "x-forwarded-for", "127.0.0.1")

      # Simulate login request
      conn = %{conn | request_path: "/users/log-in"}
      conn = MaintenancePlug.check_maintenance_restrictions(conn, [])

      assert conn.halted
      assert redirected_to(conn) == "/maintenance"
    end

    test "blocks registration requests when prevent_registration is enabled" do
      # Enable maintenance with registration prevention
      {:ok, _setting} = MaintenanceHelper.enable("Test maintenance", prevent_registration: true)

      conn = build_conn()
      conn = put_req_header(conn, "x-forwarded-for", "127.0.0.1")

      # Simulate registration request
      conn = %{conn | request_path: "/users/register"}
      conn = MaintenancePlug.check_maintenance_restrictions(conn, [])

      assert conn.halted
      assert redirected_to(conn) == "/maintenance"
    end

    test "blocks both login and registration when both restrictions are enabled" do
      # Enable maintenance with both restrictions
      {:ok, _setting} = MaintenanceHelper.enable("Test maintenance",
        prevent_login: true,
        prevent_registration: true
      )

      conn = build_conn()
      conn = put_req_header(conn, "x-forwarded-for", "127.0.0.1")

      # Test login request
      login_conn = %{conn | request_path: "/users/log-in"}
      login_conn = MaintenancePlug.check_maintenance_restrictions(login_conn, [])
      assert login_conn.halted
      assert redirected_to(login_conn) == "/maintenance"

      # Test registration request
      reg_conn = %{conn | request_path: "/users/register"}
      reg_conn = MaintenancePlug.check_maintenance_restrictions(reg_conn, [])
      assert reg_conn.halted
      assert redirected_to(reg_conn) == "/maintenance"
    end

    test "allows non-restricted requests when restrictions are enabled" do
      # Enable maintenance with restrictions
      {:ok, _setting} = MaintenanceHelper.enable("Test maintenance",
        prevent_login: true,
        prevent_registration: true
      )

      conn = build_conn()
      conn = put_req_header(conn, "x-forwarded-for", "127.0.0.1")

      # Test non-restricted request
      conn = %{conn | request_path: "/about"}
      conn = MaintenancePlug.check_maintenance_restrictions(conn, [])

      refute conn.halted
    end
  end
end
