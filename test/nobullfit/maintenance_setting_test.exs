defmodule Nobullfit.MaintenanceSettingTest do
  use Nobullfit.DataCase, async: true
  alias Nobullfit.MaintenanceSetting

  describe "changeset/2" do
    test "valid changeset with required fields" do
      attrs = %{enabled: true}
      changeset = MaintenanceSetting.changeset(%MaintenanceSetting{}, attrs)

      assert changeset.valid?
    end

    test "valid changeset with all fields" do
      attrs = %{
        enabled: true,
        message: "System maintenance in progress",
        prevent_login: true,
        prevent_registration: false
      }
      changeset = MaintenanceSetting.changeset(%MaintenanceSetting{}, attrs)

      assert changeset.valid?
    end

    test "valid changeset without enabled field (defaults to false)" do
      attrs = %{message: "Test message"}
      changeset = MaintenanceSetting.changeset(%MaintenanceSetting{}, attrs)

      assert changeset.valid?
      assert Map.has_key?(changeset.changes, :message)
      refute Map.has_key?(changeset.changes, :enabled) # No change from default
    end

    test "invalid changeset with message too long" do
      long_message = String.duplicate("a", 1001)
      attrs = %{enabled: true, message: long_message}
      changeset = MaintenanceSetting.changeset(%MaintenanceSetting{}, attrs)

      refute changeset.valid?
      assert "should be at most 1000 character(s)" in errors_on(changeset).message
    end
  end

  describe "get_latest/0" do
    test "returns nil when no settings exist" do
      assert MaintenanceSetting.get_latest() == nil
    end

    test "returns the most recent setting" do
      # Create first setting
      {:ok, _setting1} = MaintenanceSetting.create(%{enabled: true, message: "First"})

      # Create second setting (should be returned)
      {:ok, setting2} = MaintenanceSetting.create(%{enabled: false, message: "Second"})

      latest = MaintenanceSetting.get_latest()
      assert latest.id == setting2.id
      assert latest.enabled == false
      assert latest.message == "Second"
    end
  end

  describe "get_maintenance_status/0" do
    test "returns default status when no settings exist" do
      status = MaintenanceSetting.get_maintenance_status()

      assert status.enabled == false
      assert status.message == nil
      assert status.prevent_login == false
      assert status.prevent_registration == false
    end

    test "returns current maintenance status" do
      {:ok, _setting} = MaintenanceSetting.create(%{
        enabled: true,
        message: "System maintenance",
        prevent_login: true,
        prevent_registration: true
      })

      status = MaintenanceSetting.get_maintenance_status()

      assert status.enabled == true
      assert status.message == "System maintenance"
      assert status.prevent_login == true
      assert status.prevent_registration == true
    end
  end

  describe "create/1" do
    test "creates a maintenance setting with valid data" do
      attrs = %{
        enabled: true,
        message: "Test maintenance",
        prevent_login: true,
        prevent_registration: false
      }

      {:ok, setting} = MaintenanceSetting.create(attrs)

      assert setting.enabled == true
      assert setting.message == "Test maintenance"
      assert setting.prevent_login == true
      assert setting.prevent_registration == false
    end

    test "creates with default enabled value when not provided" do
      attrs = %{message: "Test message"} # enabled will default to false

      {:ok, setting} = MaintenanceSetting.create(attrs)
      assert setting.enabled == false
      assert setting.message == "Test message"
    end
  end

  describe "enable_maintenance/1" do
    test "enables maintenance with default settings" do
      {:ok, setting} = MaintenanceSetting.enable_maintenance()

      assert setting.enabled == true
      assert setting.message == nil
      assert setting.prevent_login == false
      assert setting.prevent_registration == false
    end

    test "enables maintenance with custom settings" do
      attrs = %{
        message: "Custom maintenance",
        prevent_login: true,
        prevent_registration: true
      }

      {:ok, setting} = MaintenanceSetting.enable_maintenance(attrs)

      assert setting.enabled == true
      assert setting.message == "Custom maintenance"
      assert setting.prevent_login == true
      assert setting.prevent_registration == true
    end
  end

  describe "disable_maintenance/0" do
    test "disables maintenance mode" do
      {:ok, setting} = MaintenanceSetting.disable_maintenance()

      assert setting.enabled == false
      assert setting.message == nil
      assert setting.prevent_login == false
      assert setting.prevent_registration == false
    end
  end
end
