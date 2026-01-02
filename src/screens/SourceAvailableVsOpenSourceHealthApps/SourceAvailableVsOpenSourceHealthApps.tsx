import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { Heading } from "@components/heading";
import { Text, Strong } from "@components/text";
import { Button } from "@components/button";

const SourceAvailableVsOpenSourceHealthApps: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    return (
        <>
            <div className="py-16">
                <Heading>Source-Available vs Open Source for Health Apps (Why It Matters)</Heading>
                <div className="mt-8 space-y-4">
                    <Text>
                        When choosing a health app, you might see terms like "open source" or "source-available" thrown around. Understanding what these mean, and what they don't guarantee, can help you make better decisions about your sensitive health data.
                    </Text>
                    <div className="mt-8 flex justify-center">
                        <img src="https://cdn.nobull.fit/avocado-source-available.png" alt="Source-available health app" className="w-full max-w-[300px] h-auto mx-auto" />
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Plain-English definitions</Heading>
                        <Text>
                            <Strong>Open source</Strong> typically means software released under a license that allows anyone to view, modify, and distribute the code. Common licenses include MIT, GPL, and Apache. The key idea is that the code is freely available and can be used by others, sometimes with specific requirements about how derivatives must be licensed.
                        </Text>
                        <Text>
                            <Strong>Source-available</Strong> means the source code is publicly visible, but the licensing terms may be more restrictive. You can read and review the code, but you might not have the same rights to modify or redistribute it. Some source-available projects allow contributions, while others are read-only.
                        </Text>
                        <Text>
                            NoBullFit is a <Strong>source-available health app</Strong>: our code is public on GitHub, so you can see exactly how we handle your data. You can review it and report issues, but the codebase is read-only and remains under our control.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>What transparency helps with (and what it doesn't guarantee)</Heading>
                        <Text>
                            Being able to review source code gives you several advantages:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>Verification:</Strong> You can see how data is collected, stored, and transmitted. Independent developers can audit the code for security issues or privacy concerns.
                            </Text>
                            <Text>
                                - <Strong>Understanding:</Strong> You know what the app actually does, not just what marketing claims. If you're technical, you can verify that features work as advertised.
                            </Text>
                            <Text>
                                - <Strong>Accountability:</Strong> Public code makes it harder to hide problematic practices. If something changes in a way that concerns users, it's visible in the commit history.
                            </Text>
                            <Text>
                                - <Strong>Community input:</Strong> Developers and privacy advocates can suggest improvements, report bugs, or flag potential issues.
                            </Text>
                        </div>
                        <Text>
                            However, transparency doesn't automatically guarantee:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>Perfect security:</Strong> Just because code is visible doesn't mean it's secure. Vulnerabilities can exist even in well-reviewed codebases.
                            </Text>
                            <Text>
                                - <Strong>Privacy protection:</Strong> The code might be transparent, but you still need to trust that the deployed version matches what's in the repository. Regular audits help, but they're not foolproof.
                            </Text>
                            <Text>
                                - <Strong>Data handling:</Strong> You can see how data flows through the code, but you can't always verify what happens on the server side without additional transparency measures.
                            </Text>
                            <Text>
                                - <Strong>Long-term commitment:</Strong> A project can change its approach, licensing, or even go closed-source later. Transparency is a snapshot in time, not a permanent guarantee.
                            </Text>
                        </div>
                        <Text>
                            The value comes from combining code transparency with other practices: clear privacy policies, data export options, and a track record of respecting user privacy.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Why it matters for sensitive health data</Heading>
                        <Text>
                            Health apps handle some of your most personal information: what you eat, how much you weigh, your activity levels, and sometimes medical conditions. This data is valuable to advertisers, insurers, and data brokers, which is why many health apps monetize through data selling or targeted advertising.
                        </Text>
                        <Text>
                            When a <Strong>source-available health app</Strong> makes its code public, you can verify:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - Whether data is encrypted in transit and at rest
                            </Text>
                            <Text>
                                - What information is actually sent to external services
                            </Text>
                            <Text>
                                - If there are any hidden tracking mechanisms or analytics
                            </Text>
                            <Text>
                                - How authentication and authorization work
                            </Text>
                            <Text>
                                - Whether data export and deletion features work as claimed
                            </Text>
                        </div>
                        <Text>
                            This doesn't mean you should blindly trust any source-available app. But it does mean you have a way to verify claims, and the community can help identify issues. For health data especially, this verification layer adds meaningful protection.
                        </Text>
                        <Text>
                            That said, remember that code transparency is one piece of the puzzle. You also want to see a clear privacy policy, a commitment to not selling data, and evidence that the team takes security seriously.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>How to review the code</Heading>
                        <Text>
                            If you're interested in reviewing NoBullFit's code, here's how to get started:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>Browse the repository:</Strong> Start with the README to understand the project structure and setup instructions.
                            </Text>
                            <Text>
                                - <Strong>Check key areas:</Strong> Look at authentication code, database schemas, API endpoints, and any data processing logic. These areas show how your information is handled.
                            </Text>
                            <Text>
                                - <Strong>Review recent changes:</Strong> Check the commit history to see what's been updated recently and how the project evolves.
                            </Text>
                            <Text>
                                - <Strong>Report issues:</Strong> If you find bugs, security concerns, or privacy issues, email us at support@nobull.fit. Clear, detailed reports help us address problems quickly.
                            </Text>
                        </div>
                        <Text>
                            You don't need to be an expert developer to benefit from source-available code. Even basic familiarity with code structure can help you understand what an app does, and you can always ask questions or request clarification by emailing us at support@nobull.fit.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Where to find the repository</Heading>
                        <Text>
                            NoBullFit's code is available on GitHub. You can browse the repository, review the codebase, and report issues.
                        </Text>
                        <div className="mt-6 flex justify-center">
                            <Button
                                href="https://github.com/pathvoid/nobullfit"
                                target="_blank"
                                rel="noopener noreferrer"
                                reloadDocument
                            >
                                View the code on GitHub
                            </Button>
                        </div>
                        <Text>
                            The repository includes the full application code, database schema, API endpoints, and documentation. Everything is there for you to review and understand how your data is handled.
                        </Text>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SourceAvailableVsOpenSourceHealthApps;
