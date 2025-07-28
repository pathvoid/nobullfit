defmodule Nobullfit.Repo.Migrations.CreateMaintenanceSettings do
  use Ecto.Migration

  def change do
    create table(:maintenance_settings) do
      add :enabled, :boolean, default: false, null: false
      add :message, :text
      add :prevent_login, :boolean, default: false, null: false
      add :prevent_registration, :boolean, default: false, null: false
      add :inserted_at, :utc_datetime, null: false
      add :updated_at, :utc_datetime, null: false
    end

    create index(:maintenance_settings, [:inserted_at])
  end
end
