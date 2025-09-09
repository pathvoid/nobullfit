defmodule NobullfitWeb.StaticPagesTest do
  use NobullfitWeb.ConnCase, async: true

  describe "GET /about" do
    test "renders the about page successfully", %{conn: conn} do
      conn = get(conn, ~p"/about")
      assert html_response(conn, 200)
    end
  end

  describe "GET /privacy" do
    test "renders the privacy page successfully", %{conn: conn} do
      conn = get(conn, ~p"/privacy")
      assert html_response(conn, 200)
    end
  end

  describe "GET /privacy-policy" do
    test "renders the privacy page via alternative route successfully", %{conn: conn} do
      conn = get(conn, ~p"/privacy-policy")
      assert html_response(conn, 200)
    end
  end

  describe "GET /privacy_policy" do
    test "renders the privacy page via alternative route successfully", %{conn: conn} do
      conn = get(conn, ~p"/privacy_policy")
      assert html_response(conn, 200)
    end
  end

  describe "GET /terms" do
    test "renders the terms page successfully", %{conn: conn} do
      conn = get(conn, ~p"/terms")
      assert html_response(conn, 200)
    end
  end

  describe "GET /terms-of-service" do
    test "renders the terms page via alternative route successfully", %{conn: conn} do
      conn = get(conn, ~p"/terms-of-service")
      assert html_response(conn, 200)
    end
  end

  describe "GET /terms_of_service" do
    test "renders the terms page via alternative route successfully", %{conn: conn} do
      conn = get(conn, ~p"/terms_of_service")
      assert html_response(conn, 200)
    end
  end
end
