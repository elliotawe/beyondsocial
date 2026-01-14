import Image from "next/image";
import clsx from "clsx";

type LogoProps = {
    width?: number;
    height?: number;
    className?: string;
    priority?: boolean;
};

export default function Logo({
    width = 120,
    height = 40,
    className,
    priority = false,
}: LogoProps) {
    return (
        <Image
            src="/logo.png"
            alt="Beyond Social Logo"
            width={width}
            height={height}
            priority={priority}
            className={clsx("object-contain", className)}
        />
    );
}
