import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RecipeMacrosInput, { RecipeMacros } from "./RecipeMacrosInput";

describe("RecipeMacrosInput", () => {
    const mockOnChange = vi.fn();
    const defaultMacros: RecipeMacros = {};

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render the component", () => {
        render(<RecipeMacrosInput macros={defaultMacros} onChange={mockOnChange} />);
        expect(screen.getByText("Nutritional Information (Optional)")).toBeInTheDocument();
    });

    it("should display all macro categories", () => {
        render(<RecipeMacrosInput macros={defaultMacros} onChange={mockOnChange} />);
        expect(screen.getByText("Core Macros")).toBeInTheDocument();
        expect(screen.getByText("Commonly Tracked Sub-Macros")).toBeInTheDocument();
        expect(screen.getByText("Performance & Optimization")).toBeInTheDocument();
    });

    it("should expand Core Macros by default", () => {
        render(<RecipeMacrosInput macros={defaultMacros} onChange={mockOnChange} />);
        expect(screen.getByLabelText(/Calories/i)).toBeInTheDocument();
        // Use getAllByLabelText since there might be multiple protein-related fields
        expect(screen.getAllByLabelText(/Protein/i).length).toBeGreaterThan(0);
    });

    it("should allow toggling category expansion", () => {
        render(<RecipeMacrosInput macros={defaultMacros} onChange={mockOnChange} />);

        const categoryButton = screen.getByText("Commonly Tracked Sub-Macros").closest("button");
        expect(categoryButton).toBeInTheDocument();

        fireEvent.click(categoryButton!);

        expect(screen.getByLabelText(/Fiber/i)).toBeInTheDocument();
    });

    it("should call onChange when entering macro values", () => {
        render(<RecipeMacrosInput macros={defaultMacros} onChange={mockOnChange} />);

        const caloriesInput = screen.getByLabelText(/Calories/i);
        fireEvent.change(caloriesInput, { target: { value: "250" } });

        expect(mockOnChange).toHaveBeenCalled();
    });

    it("should display existing macro values", () => {
        const macrosWithValues: RecipeMacros = {
            calories: 250,
            protein: 20,
            carbohydrates: 30,
            fat: 10
        };

        render(<RecipeMacrosInput macros={macrosWithValues} onChange={mockOnChange} />);

        const caloriesInput = screen.getByLabelText(/Calories/i) as HTMLInputElement;
        expect(caloriesInput.value).toBe("250");

        // Use getAllByLabelText and get the first match for Protein
        const proteinInputs = screen.getAllByLabelText(/Protein/i) as HTMLInputElement[];
        expect(proteinInputs[0].value).toBe("20");
    });

    it("should show indicator when category has values", () => {
        const macrosWithValues: RecipeMacros = {
            calories: 250,
            fiber: 5
        };

        render(<RecipeMacrosInput macros={macrosWithValues} onChange={mockOnChange} />);

        const coreMacrosButton = screen.getByText("Core Macros").closest("button");
        expect(coreMacrosButton?.textContent).toContain("•");
    });

    it("should display tip when macros are entered", () => {
        const macrosWithValues: RecipeMacros = {
            calories: 250
        };

        render(<RecipeMacrosInput macros={macrosWithValues} onChange={mockOnChange} />);

        expect(screen.getByText(/Tip: All values are per portion/i)).toBeInTheDocument();
    });
});

