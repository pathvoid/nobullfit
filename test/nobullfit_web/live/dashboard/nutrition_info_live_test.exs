defmodule NobullfitWeb.Dashboard.NutritionInfoLiveTest do
  use NobullfitWeb.ConnCase, async: true
  import Phoenix.LiveViewTest
  import Nobullfit.AccountsFixtures

  setup %{conn: conn} do
    user = user_fixture()
    conn = log_in_user(conn, user)
    %{user: user, conn: conn}
  end

  describe "page rendering" do
    test "renders loading state initially", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/nutrition-info/test_food_id/Test%20Food/100")

      assert html =~ "Loading nutrition information..."
      assert html =~ "loading-spinner"
    end

    test "renders page structure correctly", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/nutrition-info/test_food_id/Test%20Food/100")

      # Test basic page structure that's visible in loading state
      assert html =~ "Nutrition Information"
      assert html =~ "Detailed nutrition analysis for your selected food"
    end
  end

  describe "navigation" do
    test "shows basic navigation structure", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/nutrition-info/test_food_id/Test%20Food/100")

      # Test that the page loads and shows basic navigation
      assert html =~ "NoBullFit"
      assert html =~ "Food Database"
    end
  end

  describe "authentication" do
    test "requires authentication" do
      conn = build_conn()
      assert {:error, {:redirect, %{to: "/users/log-in"}}} = live(conn, ~p"/d/nutrition-info/test_food_id/Test%20Food/100")
    end
  end

  describe "URL parameters" do
    test "handles food_id parameter", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/nutrition-info/specific_food_id/Test%20Food/100")
      assert html =~ "Loading nutrition information..."
    end

    test "handles food_label parameter", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/nutrition-info/test_food_id/Specific%20Food%20Name/100")
      assert html =~ "Loading nutrition information..."
    end

    test "handles quantity parameter", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/nutrition-info/test_food_id/Test%20Food/250")
      assert html =~ "Loading nutrition information..."
    end

    test "handles measure_uri parameter", %{conn: conn} do
      measure_uri = URI.encode("http://www.edamam.com/ontologies/edamam.owl#Measure_cup")
      {:ok, _view, html} = live(conn, ~p"/d/nutrition-info/test_food_id/Test%20Food/100?measure_uri=#{measure_uri}")
      assert html =~ "Loading nutrition information..."
    end
  end

  describe "page elements" do
    test "shows proper page title and subtitle", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/nutrition-info/test_food_id/Test%20Food/100")

      assert html =~ "Nutrition Information"
      assert html =~ "Detailed nutrition analysis for your selected food"
    end

    test "shows loading spinner and message", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/nutrition-info/test_food_id/Test%20Food/100")

      assert html =~ "Loading nutrition information..."
      assert html =~ "loading-spinner"
    end
  end
end
