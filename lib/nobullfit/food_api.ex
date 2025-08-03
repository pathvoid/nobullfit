defmodule NoBullFit.FoodAPI do
  @moduledoc """
  Module for interacting with the Edamam Food Database API.

  This module provides functions to search for foods, get nutrition information,
  and use autocomplete functionality.
  """

  @base_url "https://api.edamam.com"
  @parser_endpoint "/api/food-database/v2/parser"
  @nutrients_endpoint "/api/food-database/v2/nutrients"
  @image_endpoint "/api/food-database/nutrients-from-image"
  @autocomplete_endpoint "/auto-complete"

  # For development purposes
  @app_id "your_edamam_food_app_id_here"
  @app_key "your_edamam_food_app_key_here"

  @doc """
  Search for foods using the parser endpoint.

  ## Parameters
  - `query` - The search query (ingredient name, brand, or UPC)
  - `opts` - Optional parameters including:
    - `app_id` - Your Edamam app ID (required)
    - `app_key` - Your Edamam app key (required)
    - `nutrition_type` - "cooking" or "logging" (default: "cooking")
    - `health` - List of health labels
    - `calories` - Calorie range (e.g., "100-300")
    - `category` - List of categories
    - `nutrients` - Map of nutrient filters

  ## Examples
      iex> FoodAPI.search_foods("apple", app_id: "your_app_id", app_key: "your_app_key")
      iex> FoodAPI.search_foods("chicken breast", nutrition_type: "logging", calories: "100-300")
  """
  def search_foods(query, opts \\ []) do
    perform_search(query, opts)
  end

  # Private function to perform the actual API search
  defp perform_search(query, opts) do
    params = build_parser_params(query, opts)

    url = "#{@base_url}#{@parser_endpoint}"

    case HTTPoison.get(url, [], params: params) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, data} ->
            {:ok, data}
          {:error, _error} -> {:error, "Unable to process the search results. Please try again."}
        end

      {:ok, %HTTPoison.Response{status_code: status_code, body: _body}} ->
        {:error, format_api_error(status_code)}

      {:error, %HTTPoison.Error{reason: _reason}} ->
        {:error, "Unable to connect to the food database. Please check your internet connection and try again."}
    end
  end

  @doc """
  Get detailed nutrition information for specific foods.

  ## Parameters
  - `ingredients` - List of ingredient maps with foodId, quantity, and measureURI
  - `opts` - Optional parameters including:
    - `app_id` - Your Edamam app ID (required)
    - `app_key` - Your Edamam app key (required)

  ## Examples
      iex> ingredients = [
      ...>   %{foodId: "food_id", quantity: 100, measureURI: "measure_uri"}
      ...> ]
      iex> FoodAPI.get_nutrients(ingredients, app_id: "your_app_id", app_key: "your_app_key")
  """
  def get_nutrients(ingredients, opts \\ []) do
    {app_id, app_key} = get_credentials(opts)

    url = "#{@base_url}#{@nutrients_endpoint}?app_id=#{app_id}&app_key=#{app_key}"

    body = Jason.encode!(%{ingredients: ingredients})

    case HTTPoison.post(url, body, [{"Content-Type", "application/json"}]) do
      {:ok, %HTTPoison.Response{status_code: 200, body: response_body}} ->
        case Jason.decode(response_body) do
          {:ok, data} -> {:ok, data}
          {:error, _error} -> {:error, "Unable to process the nutrition data. Please try again."}
        end

      {:ok, %HTTPoison.Response{status_code: status_code, body: _body}} ->
        {:error, format_api_error(status_code)}

      {:error, %HTTPoison.Error{reason: _reason}} ->
        {:error, "Unable to connect to the food database. Please check your internet connection and try again."}
    end
  end

  @doc """
  Get nutrition information from an image.

  ## Parameters
  - `image_data` - Map with either "image" (base64) or "image_url" (URL)
  - `opts` - Optional parameters including:
    - `app_id` - Your Edamam app ID (required)
    - `app_key` - Your Edamam app key (required)

  ## Examples
      iex> FoodAPI.get_nutrients_from_image(%{image_url: "https://example.com/food.jpg"},
      ...>   app_id: "your_app_id", app_key: "your_app_key")
      iex> FoodAPI.get_nutrients_from_image(%{image: "data:image/jpeg;base64,..."},
      ...>   app_id: "your_app_id", app_key: "your_app_key")
  """
  def get_nutrients_from_image(image_data, opts \\ []) do
    {app_id, app_key} = get_credentials(opts)

    url = "#{@base_url}#{@image_endpoint}?app_id=#{app_id}&app_key=#{app_key}"

    body = Jason.encode!(image_data)

    case HTTPoison.post(url, body, [{"Content-Type", "application/json"}]) do
      {:ok, %HTTPoison.Response{status_code: 200, body: response_body}} ->
        case Jason.decode(response_body) do
          {:ok, data} -> {:ok, data}
          {:error, _error} -> {:error, "Unable to process the image data. Please try again."}
        end

      {:ok, %HTTPoison.Response{status_code: status_code, body: _body}} ->
        {:error, format_api_error(status_code)}

      {:error, %HTTPoison.Error{reason: _reason}} ->
        {:error, "Unable to connect to the food database. Please check your internet connection and try again."}
    end
  end

  @doc """
  Get autocomplete suggestions for food search.

  ## Parameters
  - `query` - The search query
  - `opts` - Optional parameters including:
    - `app_id` - Your Edamam app ID (required)
    - `app_key` - Your Edamam app key (required)
    - `limit` - Number of suggestions (1-10, default: 10)

  ## Examples
      iex> FoodAPI.autocomplete("chi", app_id: "your_app_id", app_key: "your_app_key")
      iex> FoodAPI.autocomplete("apple", limit: 5, app_id: "your_app_id", app_key: "your_app_key")
  """
  def autocomplete(query, opts \\ []) do
    {app_id, app_key} = get_credentials(opts)
    limit = Keyword.get(opts, :limit, 10)

    params = [
      {"app_id", app_id},
      {"app_key", app_key},
      {"q", query},
      {"limit", limit}
    ]

    url = "#{@base_url}#{@autocomplete_endpoint}"

    case HTTPoison.get(url, [], params: params) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, data} -> {:ok, data}
          {:error, _error} -> {:error, "Unable to process the autocomplete suggestions. Please try again."}
        end

      {:ok, %HTTPoison.Response{status_code: status_code, body: _body}} ->
        {:error, format_api_error(status_code)}

      {:error, %HTTPoison.Error{reason: _reason}} ->
        {:error, "Unable to connect to the food database. Please check your internet connection and try again."}
    end
  end

  # Helper function to get credentials from options or environment
  defp get_credentials(opts) do
    app_id = Keyword.get(opts, :app_id) || System.get_env("EDAMAM_FOOD_APP_ID") || @app_id
    app_key = Keyword.get(opts, :app_key) || System.get_env("EDAMAM_FOOD_APP_KEY") || @app_key

    if app_id == "your_edamam_food_app_id_here" or app_key == "your_edamam_food_app_key_here" do
      raise "Edamam credentials required. Please update @app_id and @app_key in the FoodAPI module or set EDAMAM_FOOD_APP_ID and EDAMAM_FOOD_APP_KEY environment variables."
    end

    {app_id, app_key}
  end

  # Helper function to format API errors for user-friendly messages
  defp format_api_error(status_code) do
    case status_code do
      401 -> "Authentication failed. Please check your API credentials."
      403 -> "Access denied. Please check your API permissions."
      429 -> "Too many requests. Please wait a moment and try again."
      500 -> "The food database is temporarily unavailable. Please try again later."
      502 -> "The food database is temporarily unavailable. Please try again later."
      503 -> "The food database is temporarily unavailable. Please try again later."
      504 -> "The food database is temporarily unavailable. Please try again later."
      _ -> "Unable to search the food database at this time. Please try again later."
    end
  end

  # Helper function to build parser parameters
  defp build_parser_params(query, opts) do
    base_params = [
      {"app_id", Keyword.get(opts, :app_id) || System.get_env("EDAMAM_FOOD_APP_ID") || @app_id},
      {"app_key", Keyword.get(opts, :app_key) || System.get_env("EDAMAM_FOOD_APP_KEY") || @app_key}
    ]

    # Determine query type and add appropriate parameter
    query_params = cond do
      String.match?(query, ~r/^\d+$/) -> [{"upc", query}]
      String.contains?(query, " ") -> [{"ingr", query}]
      true -> [{"ingr", query}]
    end

    # Add optional parameters
    optional_params = []

    optional_params = if nutrition_type = Keyword.get(opts, :nutrition_type) do
      [{"nutrition-type", nutrition_type} | optional_params]
    else
      optional_params
    end

    optional_params = if health = Keyword.get(opts, :health) do
      health_params = Enum.map(health, &{"health", &1})
      health_params ++ optional_params
    else
      optional_params
    end

    optional_params = if calories = Keyword.get(opts, :calories) do
      [{"calories", calories} | optional_params]
    else
      optional_params
    end

    optional_params = if category = Keyword.get(opts, :category) do
      category_params = Enum.map(category, &{"category", &1})
      category_params ++ optional_params
    else
      optional_params
    end

    optional_params = if nutrients = Keyword.get(opts, :nutrients) do
      nutrient_params = Enum.map(nutrients, fn {key, value} ->
        {"nutrients[#{key}]", value}
      end)
      nutrient_params ++ optional_params
    else
      optional_params
    end

    base_params ++ query_params ++ optional_params
  end

  @doc """
  Convenience function to search for foods and print results to console.

  ## Examples
      iex> FoodAPI.search_and_print("apple")
      iex> FoodAPI.search_and_print("chicken breast", nutrition_type: "logging")
  """
  def search_and_print(query, opts \\ []) do
    case search_foods(query, opts) do
      {:ok, data} ->
        IO.puts("\n=== Food Search Results for '#{query}' ===")
        IO.puts("Found #{data["count"]} results")

        if data["parsed"] do
          Enum.each(data["parsed"], fn parsed_item ->
            food = parsed_item["food"]
            IO.puts("\nFood: #{food["label"]}")
            IO.puts("Brand: #{food["brand"] || "Generic"}")
            IO.puts("Category: #{food["categoryLabel"] || "Unknown"}")

            if food["nutrients"] do
              nutrients = food["nutrients"]
              IO.puts("Calories: #{nutrients["ENERC_KCAL"] || "N/A"} kcal")
              IO.puts("Protein: #{nutrients["PROCNT"] || "N/A"}g")
              IO.puts("Carbs: #{nutrients["CHOCDF"] || "N/A"}g")
              IO.puts("Fat: #{nutrients["FAT"] || "N/A"}g")
            end

            if parsed_item["measure"] do
              measure = parsed_item["measure"]
              IO.puts("Serving: #{measure["label"]} (#{measure["weight"]}g)")
            end
          end)
        end

        if data["hints"] do
          IO.puts("\n=== Additional Suggestions ===")
          Enum.take(data["hints"], 3)
          |> Enum.each(fn hint ->
            food = hint["food"]
            IO.puts("- #{food["label"]} (#{food["brand"] || "Generic"})")
          end)
        end

        {:ok, data}

      {:error, error} ->
        IO.puts("Error: #{error}")
        {:error, error}
    end
  end

  @doc """
  Convenience function to get nutrients and print results to console.

  ## Examples
      iex> ingredients = [%{foodId: "food_id", quantity: 100, measureURI: "measure_uri"}]
      iex> FoodAPI.get_nutrients_and_print(ingredients)
  """
  def get_nutrients_and_print(ingredients, opts \\ []) do
    case get_nutrients(ingredients, opts) do
      {:ok, data} ->
        IO.puts("\n=== Nutrition Information ===")
        IO.puts("Total Calories: #{data["calories"]}")
        IO.puts("Total Weight: #{data["totalWeight"]}g")

        if data["dietLabels"] do
          IO.puts("Diet Labels: #{Enum.join(data["dietLabels"], ", ")}")
        end

        if data["healthLabels"] do
          IO.puts("Health Labels: #{Enum.join(data["healthLabels"], ", ")}")
        end

        if data["totalNutrients"] do
          IO.puts("\n=== Key Nutrients ===")
          nutrients = data["totalNutrients"]

          key_nutrients = [
            {"ENERC_KCAL", "Calories"},
            {"PROCNT", "Protein"},
            {"CHOCDF", "Carbohydrates"},
            {"FAT", "Total Fat"},
            {"FIBTG", "Fiber"},
            {"SUGAR", "Sugars"},
            {"NA", "Sodium"},
            {"CA", "Calcium"},
            {"FE", "Iron"}
          ]

          Enum.each(key_nutrients, fn {key, label} ->
            if nutrients[key] do
              nutrient = nutrients[key]
              IO.puts("#{label}: #{nutrient["quantity"]}#{nutrient["unit"]}")
            end
          end)
        end

        {:ok, data}

      {:error, error} ->
        IO.puts("Error: #{error}")
        {:error, error}
    end
  end

  @doc """
  Convenience function to get autocomplete suggestions and print results to console.

  ## Examples
      iex> FoodAPI.autocomplete_and_print("chi")
      iex> FoodAPI.autocomplete_and_print("apple", limit: 5)
  """
  def autocomplete_and_print(query, opts \\ []) do
    case autocomplete(query, opts) do
      {:ok, suggestions} ->
        IO.puts("\n=== Autocomplete Suggestions for '#{query}' ===")
        Enum.each(suggestions, fn suggestion ->
          IO.puts("- #{suggestion}")
        end)
        {:ok, suggestions}

      {:error, error} ->
        IO.puts("Error: #{error}")
        {:error, error}
    end
  end
end
