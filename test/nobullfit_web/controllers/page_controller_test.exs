defmodule NobullfitWeb.PageControllerTest do
  use NobullfitWeb.ConnCase

  test "GET /", %{conn: conn} do
    conn = get(conn, ~p"/")
    assert html_response(conn, 200) =~ "Nobullfit"
  end

  test "GET /about", %{conn: conn} do
    conn = get(conn, ~p"/about")
    assert html_response(conn, 200) =~ "About"
  end

  test "GET /projects", %{conn: conn} do
    conn = get(conn, ~p"/projects")
    assert html_response(conn, 200) =~ "Projects"
  end

  test "GET /apps", %{conn: conn} do
    conn = get(conn, ~p"/apps")
    assert html_response(conn, 200) =~ "Apps"
  end
end
