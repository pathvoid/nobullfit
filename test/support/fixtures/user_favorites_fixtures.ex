defmodule Nobullfit.UserFavoritesFixtures do
  @moduledoc """
  This module defines test fixtures for the UserFavorites context.
  """

  alias Nobullfit.UserFavorites

  @doc """
  Generate a food favorite.
  """
  def food_favorite_fixture(user, attrs \\ %{}) do
    {:ok, favorite} =
      attrs
      |> Enum.into(%{
        user_id: user.id,
        favorite_type: "food",
        external_id: "food_#{System.unique_integer()}",
        name: "Test Food #{System.unique_integer()}",
        calories: 150,
        protein: Decimal.new("10.5"),
        carbs: Decimal.new("20.0"),
        fat: Decimal.new("5.0"),
        health_labels: ["VEGETARIAN", "LOW_SODIUM"],
        measure_uri: "http://www.edamam.com/ontologies/edamam.owl#Measure_gram",
        quantity: 100,
        serving_sizes: [%{"label" => "1 cup", "quantity" => 100}],
        measures: [%{"label" => "cup", "uri" => "http://www.edamam.com/ontologies/edamam.owl#Measure_cup"}]
      })
      |> UserFavorites.create_user_favorite()

    favorite
  end

  @doc """
  Generate a recipe favorite.
  """
  def recipe_favorite_fixture(user, attrs \\ %{}) do
    {:ok, favorite} =
      attrs
      |> Enum.into(%{
        user_id: user.id,
        favorite_type: "recipe",
        external_id: "recipe_#{System.unique_integer()}",
        name: "Test Recipe #{System.unique_integer()}",
        calories: 300,
        protein: Decimal.new("15.0"),
        carbs: Decimal.new("45.0"),
        fat: Decimal.new("8.0"),
        image_url: "https://example.com/recipe.jpg",
        external_url: "https://example.com/recipe",
        diet_labels: ["BALANCED"],
        yield: 4,
        recipe_data: %{
          "recipe" => %{
            "label" => "Test Recipe",
            "uri" => "recipe_#{System.unique_integer()}",
            "image" => "https://example.com/recipe.jpg",
            "url" => "https://example.com/recipe",
            "yield" => 4,
            "calories" => 1200,
            "totalNutrients" => %{
              "ENERC_KCAL" => %{"quantity" => 1200, "unit" => "kcal"},
              "PROCNT" => %{"quantity" => 60, "unit" => "g"},
              "CHOCDF" => %{"quantity" => 180, "unit" => "g"},
              "FAT" => %{"quantity" => 32, "unit" => "g"}
            },
            "dietLabels" => ["BALANCED"]
          }
        }
      })
      |> UserFavorites.create_user_favorite()

    favorite
  end
end
