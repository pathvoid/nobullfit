defmodule Nobullfit.MaintenanceHelperTest do
  use Nobullfit.DataCase, async: true
  alias Nobullfit.MaintenanceHelper
  alias Nobullfit.MaintenanceSetting

  describe "enable/2" do
    test "enables maintenance mode with default settings" do
      {:ok, setting} = MaintenanceHelper.enable()

      assert setting.enabled == true
      assert setting.message == nil
      assert setting.prevent_login == false
      assert setting.prevent_registration == false
    end

    test "enables maintenance mode with custom message" do
      message = "Database migration in progress"
      {:ok, setting} = MaintenanceHelper.enable(message)

      assert setting.enabled == true
      assert setting.message == message
      assert setting.prevent_login == false
      assert setting.prevent_registration == false
    end

    test "enables maintenance mode with login prevention" do
      {:ok, setting} = MaintenanceHelper.enable("System upgrade", prevent_login: true)

      assert setting.enabled == true
      assert setting.prevent_login == true
      assert setting.prevent_registration == false
    end

    test "enables maintenance mode with registration prevention" do
      {:ok, setting} = MaintenanceHelper.enable("System upgrade", prevent_registration: true)

      assert setting.enabled == true
      assert setting.prevent_login == false
      assert setting.prevent_registration == true
    end

    test "enables maintenance mode with both restrictions" do
      {:ok, setting} = MaintenanceHelper.enable("System upgrade",
        prevent_login: true,
        prevent_registration: true
      )

      assert setting.enabled == true
      assert setting.prevent_login == true
      assert setting.prevent_registration == true
    end
  end

  describe "disable/0" do
    test "disables maintenance mode" do
      # First enable maintenance mode
      {:ok, _setting} = MaintenanceHelper.enable("Test maintenance")

      # Then disable it
      :ok = MaintenanceHelper.disable()

      # Check that the latest setting is disabled
      latest_setting = MaintenanceSetting.get_latest()
      assert latest_setting.enabled == false
    end
  end

  describe "status/0" do
    test "returns maintenance status when disabled" do
      # Ensure maintenance is disabled
      MaintenanceHelper.disable()

      status = MaintenanceHelper.status()
      assert status.enabled == false
      assert status.message == nil
      assert status.prevent_login == false
      assert status.prevent_registration == false
    end

    test "returns maintenance status when enabled" do
      message = "System maintenance"
      {:ok, _setting} = MaintenanceHelper.enable(message,
        prevent_login: true,
        prevent_registration: true
      )

      status = MaintenanceHelper.status()
      assert status.enabled == true
      assert status.message == message
      assert status.prevent_login == true
      assert status.prevent_registration == true
    end
  end
end
