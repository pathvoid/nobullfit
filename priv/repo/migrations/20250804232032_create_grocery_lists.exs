defmodule Nobullfit.Repo.Migrations.CreateGroceryLists do
  use Ecto.Migration

  def change do
    create table(:grocery_lists) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :name, :string, null: false
      add :description, :text
      add :is_active, :boolean, default: true, null: false

      timestamps()
    end

    create index(:grocery_lists, [:user_id])
    create index(:grocery_lists, [:user_id, :is_active])

    create table(:grocery_items) do
      add :grocery_list_id, references(:grocery_lists, on_delete: :delete_all), null: false
      add :name, :string, null: false
      add :quantity, :string
      add :is_completed, :boolean, default: false, null: false
      add :sort_order, :integer, default: 0, null: false

      timestamps()
    end

    create index(:grocery_items, [:grocery_list_id])
    create index(:grocery_items, [:grocery_list_id, :is_completed])
    create index(:grocery_items, [:grocery_list_id, :sort_order])
  end
end
