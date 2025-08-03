defmodule Nobullfit.Repo.Migrations.CreateFoodEntries do
  use Ecto.Migration

  def change do
    create table(:food_entries) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :entry_date, :date, null: false
      add :name, :string, null: false
      add :meal_type, :string, null: false
      add :calories, :decimal, precision: 8, scale: 2, null: false
      add :protein, :decimal, precision: 8, scale: 2, default: 0.0
      add :carbs, :decimal, precision: 8, scale: 2, default: 0.0

      timestamps()
    end

    create index(:food_entries, [:user_id])
    create index(:food_entries, [:entry_date])
    create index(:food_entries, [:user_id, :entry_date])
  end
end
