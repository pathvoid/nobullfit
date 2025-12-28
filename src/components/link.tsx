import * as Headless from "@headlessui/react";
import { Link as ReactRouterLink, type LinkProps } from "react-router-dom";
import { forwardRef } from "react";

// Link component wrapper - uses React Router Link with Headless UI DataInteractive for accessibility
export const Link = forwardRef(function Link(
  props: { href: string } & Omit<LinkProps, "to"> & React.ComponentPropsWithoutRef<"a">,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  return (
    <Headless.DataInteractive>
      <ReactRouterLink {...props} to={props.href} ref={ref} />
    </Headless.DataInteractive>
  );
});
