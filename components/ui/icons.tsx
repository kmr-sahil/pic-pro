/** Thin, SF-Symbols-ish line icons. All inherit `currentColor`. */

type IconProps = React.SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12.5l5 5 10-11" />
  </Icon>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 9.5l6 6 6-6" />
  </Icon>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14.5 5l-7 7 7 7" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 5l7 7-7 7" />
  </Icon>
);

export const AlbumIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 8.5A2.5 2.5 0 016 6h3.2l1.6 2H18a2.5 2.5 0 012.5 2.5v6A2.5 2.5 0 0118 19H6a2.5 2.5 0 01-2.5-2.5z" />
  </Icon>
);

export const TagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11.4 3.6H19a1.4 1.4 0 011.4 1.4v7.6a1.4 1.4 0 01-.4 1l-7 7a1.4 1.4 0 01-2 0l-7.2-7.2a1.4 1.4 0 010-2l7.6-7.4a1.4 1.4 0 011-.4z" />
    <circle cx="16" cy="8" r="1.4" fill="currentColor" stroke="none" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0111 4h2a1.5 1.5 0 011.5 1.5V7M6.5 7l.8 11.6A1.5 1.5 0 008.8 20h6.4a1.5 1.5 0 001.5-1.4L17.5 7" />
  </Icon>
);

export const PhotosIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M3.7 16l4.1-3.8a2 2 0 012.7 0l3 2.8m0 0l1.6-1.5a2 2 0 012.7 0l2.4 2.2m-6.7-.7l2 1.9" />
    <circle cx="9" cy="8.6" r="1.4" />
  </Icon>
);

export const PlayIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 5.5l10 6.5-10 6.5z" fill="currentColor" strokeWidth={1.2} />
  </Icon>
);

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.8v5M12 16.2h.01" />
  </Icon>
);

export const RetryIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12a8 8 0 11-2.6-5.9M20 4v4.5h-4.5" />
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10.8" cy="10.8" r="6.3" />
    <path d="M15.5 15.5L20 20" />
  </Icon>
);

export const PencilIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20l.9-3.6L15.6 5.7a2 2 0 012.8 0l1 1a2 2 0 010 2.8L8.6 19.1z" />
  </Icon>
);

export const SignOutIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h7a2 2 0 002-2v-2M10.5 12H21m0 0l-3-3m3 3l-3 3" />
  </Icon>
);

export const SelectIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.4 12.2l2.5 2.5 4.7-5" />
  </Icon>
);

export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4.5 15.5v2.5A2 2 0 006.5 20h11a2 2 0 002-2v-2.5" />
  </Icon>
);
