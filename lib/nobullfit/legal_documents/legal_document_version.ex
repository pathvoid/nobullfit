defmodule Nobullfit.LegalDocuments.LegalDocumentVersion do
  use Ecto.Schema
  import Ecto.Changeset

  schema "legal_document_versions" do
    field :document_type, :string
    field :version, :string
    field :content_hash, :string
    field :effective_date, :date
    field :is_active, :boolean, default: true

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(legal_document_version, attrs) do
    legal_document_version
    |> cast(attrs, [:document_type, :version, :content_hash, :effective_date, :is_active])
    |> validate_required([:document_type, :version, :content_hash, :effective_date])
    |> validate_inclusion(:document_type, ["privacy_policy", "terms_of_service"])
    |> unique_constraint([:document_type, :version])
  end
end
