defmodule Nobullfit.Repo.Migrations.CreateUserFavorites do
  use Ecto.Migration

  def change do
    create table(:user_favorites) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :favorite_type, :string, null: false # "food" or "recipe"
      add :external_id, :string, null: false # Food ID or Recipe URI from external API
      add :name, :string, null: false # Food name or recipe label
      add :calories, :integer # Calories per serving
      add :protein, :decimal, precision: 8, scale: 2 # Protein in grams
      add :carbs, :decimal, precision: 8, scale: 2 # Carbs in grams
      add :fat, :decimal, precision: 8, scale: 2 # Fat in grams
      add :image_url, :string # Recipe image URL (for recipes only)
      add :external_url, :string # Recipe URL (for recipes only)
      add :diet_labels, {:array, :string} # Diet labels for recipes
      add :health_labels, {:array, :string} # Health labels for foods
      add :measure_uri, :string # Default measure URI for foods
      add :quantity, :integer, default: 100 # Default quantity in grams

      timestamps()
    end

    # Create unique index to prevent duplicate favorites
    create unique_index(:user_favorites, [:user_id, :favorite_type, :external_id], name: :user_favorites_unique_index)

    # Create index for faster queries
    create index(:user_favorites, [:user_id, :favorite_type])
  end
end
