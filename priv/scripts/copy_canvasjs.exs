#!/usr/bin/env elixir

# Script to copy canvasjs.min.js to static assets
source_path = Path.join([File.cwd!(), "assets", "vendor", "canvasjs.min.js"])
dest_path = Path.join([File.cwd!(), "priv", "static", "assets", "js", "canvasjs.min.js"])

# Ensure the destination directory exists
dest_dir = Path.dirname(dest_path)
File.mkdir_p!(dest_dir)

# Copy the file
case File.copy(source_path, dest_path) do
  {:ok, _bytes} ->
    IO.puts("Successfully copied canvasjs.min.js to #{dest_path}")
  {:error, reason} ->
    IO.puts("Failed to copy canvasjs.min.js: #{reason}")
    System.halt(1)
end
