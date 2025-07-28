defmodule Nobullfit.Repo.Migrations.AddUpdatedAtToMaintenanceSettings do
  use Ecto.Migration

  def change do
    alter table(:maintenance_settings) do
      add :updated_at, :utc_datetime, null: false, default: fragment("NOW()")
    end
  end
end
