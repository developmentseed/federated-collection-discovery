import { chakra, ImageProps, forwardRef } from "@chakra-ui/react";
import logo from "../assets/logo.svg";

interface LogoProps extends ImageProps {
  size?: string | number; // Adding a size prop
}

export const Logo = forwardEnhanced<LogoProps, "img">((props, ref) => {
  const { size = "100", ...rest } = props; // Default size is "100"

  return (
    <chakra.img
      width={size} // Apply width as size
      height={size} // Apply height as size
      src={logo}
      ref={ref}
      {...rest}
    />
  );
});

// Helper Function to correctly type forwardRef with default generic types
function forwardEnhanced<P, T extends React.ElementType>(
  component: React.ForwardRefRenderFunction<T, P>,
) {
  return forwardRef(component as any) as unknown as (
    props: P & { as?: T },
  ) => JSX.Element;
}
