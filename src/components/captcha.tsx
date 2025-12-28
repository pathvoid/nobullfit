import { useState, useEffect } from "react";
import { Field, Label } from "@components/fieldset";
import { Input } from "@components/input";
import { Text } from "@components/text";

interface CaptchaProps {
    name?: string;
    onValidate?: (isValid: boolean) => void;
}

// Generate a simple math problem
function generateMathProblem(): { question: string; answer: number } {
    const operations = ["+", "-"];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let num1: number;
    let num2: number;
    let answer: number;
    
    if (operation === "+") {
        num1 = Math.floor(Math.random() * 10) + 1; // 1-10
        num2 = Math.floor(Math.random() * 10) + 1; // 1-10
        answer = num1 + num2;
    } else {
        num1 = Math.floor(Math.random() * 10) + 11; // 11-20
        num2 = Math.floor(Math.random() * num1) + 1; // 1 to num1
        answer = num1 - num2;
    }
    
    return {
        question: `${num1} ${operation} ${num2}`,
        answer
    };
}

export function Captcha({ name = "captcha", onValidate }: CaptchaProps) {
    const [problem, setProblem] = useState<{ question: string; answer: number }>(() => generateMathProblem());
    const [userAnswer, setUserAnswer] = useState<string>("");
    const [isValid, setIsValid] = useState<boolean>(false);
    
    useEffect(() => {
        // Validate answer whenever user input changes
        const answer = parseInt(userAnswer.trim(), 10);
        const valid = !isNaN(answer) && answer === problem.answer;
        setIsValid(valid);
        
        if (onValidate) {
            onValidate(valid);
        }
    }, [userAnswer, problem.answer, onValidate]);
    
    const handleRefresh = () => {
        setProblem(generateMathProblem());
        setUserAnswer("");
        setIsValid(false);
        if (onValidate) {
            onValidate(false);
        }
    };
    
    return (
        <Field>
            <Label>
                What is {problem.question}?
                <button
                    type="button"
                    onClick={handleRefresh}
                    className="ml-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline"
                    aria-label="Generate new math problem"
                >
                    Refresh
                </button>
            </Label>
            <Input
                type="number"
                name={name}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Enter your answer"
                required
                aria-label={`Answer to ${problem.question}`}
            />
            <input type="hidden" name={`${name}_answer`} value={problem.answer} />
            {userAnswer && !isValid && (
                <Text className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Incorrect answer. Please try again.
                </Text>
            )}
        </Field>
    );
}
