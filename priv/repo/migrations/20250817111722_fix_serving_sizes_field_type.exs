defmodule Nobullfit.Repo.Migrations.FixServingSizesFieldType do
  use Ecto.Migration

  def change do
    alter table(:user_favorites) do
      remove :serving_sizes
    end

    alter table(:user_favorites) do
      add :serving_sizes, {:array, :map}
    end
  end
end
