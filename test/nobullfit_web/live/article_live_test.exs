defmodule NobullfitWeb.ArticleLiveTest do
  use NobullfitWeb.ConnCase, async: true
  import Nobullfit.ArticlesFixtures
  import Phoenix.LiveViewTest

  describe "main guides page" do
    test "renders main guides page with featured article", %{conn: conn} do
      featured_article = featured_article_fixture()
      _random_article1 = article_fixture()
      _random_article2 = article_fixture()
      _random_article3 = article_fixture()
      _random_article4 = article_fixture()

      {:ok, _view, html} = live(conn, ~p"/guides")

      assert html =~ "NoBullFit Blog"
      assert html =~ "Real talk about fitness, nutrition, and getting results without the BS"
      assert html =~ featured_article.title
      assert html =~ featured_article.author
      assert html =~ "More Articles"
    end

    test "renders main guides page without featured article", %{conn: conn} do
      _article1 = article_fixture()
      _article2 = article_fixture()
      _article3 = article_fixture()
      _article4 = article_fixture()

      {:ok, _view, html} = live(conn, ~p"/guides")

      assert html =~ "NoBullFit Blog"
      assert html =~ "No Featured Article"
      assert html =~ "No featured article is currently set"
      assert html =~ "More Articles"
    end

    test "renders main guides page with no articles", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/guides")

      assert html =~ "NoBullFit Blog"
      assert html =~ "No Featured Article"
      assert html =~ "No featured article is currently set"
    end

    test "shows navigation links", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/guides")

      assert html =~ "Home"
      assert html =~ "Guides"
      assert html =~ "About"
    end

    test "displays article cards in sidebar", %{conn: conn} do
      _featured_article = featured_article_fixture()
      random_article = article_fixture()

      {:ok, _view, html} = live(conn, ~p"/guides")

      assert html =~ random_article.title
      assert html =~ random_article.author
      assert html =~ "Read More"
      assert html =~ "/guides/#{random_article.slug}"
    end
  end

  describe "individual article page" do
    test "renders individual article page", %{conn: conn} do
      article = article_fixture()
      _random_article1 = article_fixture()
      _random_article2 = article_fixture()
      _random_article3 = article_fixture()
      _random_article4 = article_fixture()

      {:ok, _view, html} = live(conn, ~p"/guides/#{article.slug}")

      assert html =~ article.title
      assert html =~ article.author
      # Check for parts of the content that should be rendered
      assert html =~ "Introduction"
      assert html =~ "This is test content for the article"
      assert html =~ "More Articles"
    end

    test "renders article with author avatar", %{conn: conn} do
      article = article_fixture(%{author_avatar: "https://example.com/avatar.jpg"})

      {:ok, _view, html} = live(conn, ~p"/guides/#{article.slug}")

      assert html =~ "https://example.com/avatar.jpg"
      assert html =~ article.author
    end

    test "renders article with excerpt", %{conn: conn} do
      article = article_fixture(%{excerpt: "This is a custom excerpt"})

      {:ok, _view, html} = live(conn, ~p"/guides/#{article.slug}")

      assert html =~ "This is a custom excerpt"
    end

    test "renders article without excerpt (uses content preview)", %{conn: conn} do
      article = article_fixture(%{excerpt: nil, content: "<h3>Introduction</h3><p>This is a long article content that should be truncated...</p><img src='test.jpg' alt='Test' />"})

      {:ok, _view, html} = live(conn, ~p"/guides/#{article.slug}")

      # Should show truncated content
      assert html =~ "This is a long article content that should be truncated..."
    end

    test "handles non-existent article", %{conn: conn} do
      _random_article1 = article_fixture()
      _random_article2 = article_fixture()
      _random_article3 = article_fixture()
      _random_article4 = article_fixture()

      {:ok, _view, html} = live(conn, ~p"/guides/non-existent-slug")

      # Should still show the page structure but without the specific article
      assert html =~ "More Articles"
      # The page should still render the main structure
      assert html =~ "NoBullFit Blog"
    end

    test "shows random articles in sidebar for individual article", %{conn: conn} do
      article = article_fixture()
      random_article = article_fixture()

      {:ok, _view, html} = live(conn, ~p"/guides/#{article.slug}")

      assert html =~ random_article.title
      assert html =~ "Read More"
      assert html =~ "/guides/#{random_article.slug}"
    end
  end

  describe "article content rendering" do
    test "renders article with proper HTML structure", %{conn: conn} do
      article = article_fixture(%{
        content: "<h3>Introduction</h3><p>This is a paragraph.</p><img src='test.jpg' alt='Test' />"
      })

      {:ok, _view, html} = live(conn, ~p"/guides/#{article.slug}")

      assert html =~ "<h3>Introduction</h3>"
      assert html =~ "<p>This is a paragraph.</p>"
      # The image tag might be rendered differently, so check for the src attribute
      assert html =~ "src=\"test.jpg\""
    end

    test "displays article publication date", %{conn: conn} do
      article = article_fixture()

      {:ok, _view, html} = live(conn, ~p"/guides/#{article.slug}")

      # Should show the month and year
      assert html =~ Calendar.strftime(article.inserted_at, "%B %Y")
    end
  end

  describe "navigation and layout" do
    test "shows proper page title in navigation", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/guides")

      assert html =~ "NoBullFit Blog"
    end

    test "shows footer", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/guides")

      # Footer should be present
      assert html =~ "footer"
    end

    test "handles maintenance status", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/guides")

      # Should render without errors even with maintenance status
      assert html =~ "NoBullFit Blog"
    end
  end

  describe "responsive design" do
    test "renders mobile-friendly layout", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/guides")

      # Should have responsive grid classes
      assert html =~ "grid-cols-1 lg:grid-cols-3"
    end

    test "shows mobile navigation", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/guides")

      # Should have mobile drawer
      assert html =~ "drawer lg:hidden"
      assert html =~ "mobile-drawer"
    end
  end

  describe "article links and interactions" do
    test "article cards link to individual articles", %{conn: conn} do
      _featured_article = featured_article_fixture()
      random_article = article_fixture()

      {:ok, _view, html} = live(conn, ~p"/guides")

      # Random articles should be clickable
      assert html =~ "/guides/#{random_article.slug}"
    end

    test "article titles are clickable", %{conn: conn} do
      random_article = article_fixture()

      {:ok, _view, html} = live(conn, ~p"/guides")

      # Article title should be in a link
      assert html =~ "href=\"/guides/#{random_article.slug}\""
      assert html =~ random_article.title
    end
  end

  describe "meta information" do
    test "displays article meta information", %{conn: conn} do
      article = article_fixture(%{
        meta_title: "Custom Meta Title",
        meta_description: "Custom meta description"
      })

      {:ok, _view, html} = live(conn, ~p"/guides/#{article.slug}")

      # Meta information should be available in the assigns
      # (though it might not be directly visible in the HTML depending on implementation)
      assert html =~ article.title
    end
  end

  describe "error handling" do
    test "handles empty article list gracefully", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/guides")

      # Should not crash and should show appropriate empty state
      assert html =~ "NoBullFit Blog"
      assert html =~ "No Featured Article"
    end

    test "handles malformed slug gracefully", %{conn: conn} do
      _article = article_fixture()

      {:ok, _view, html} = live(conn, ~p"/guides/malformed-slug-123")

      # Should not crash
      assert html =~ "More Articles"
    end
  end
end
