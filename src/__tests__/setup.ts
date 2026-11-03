import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi, beforeEach } from 'vitest';

// Next.js Google Font mock for testing environment
vi.mock('next/font/google', () => ({
  Noto_Sans_JP: () => ({
    className: 'noto-sans-jp-font',
    style: { fontFamily: 'Noto Sans JP' },
  }),
}));

// Next.js Link mock for testing environment
vi.mock('next/link', () => {
  return {
    default: ({
      href,
      children,
      onClick,
      ...rest
    }: {
      href: string;
      children: React.ReactNode;
      onClick?: React.MouseEventHandler<HTMLAnchorElement>;
      [key: string]: any;
    }) => {
      return React.createElement(
        'a',
        {
          href,
          onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            if (onClick) onClick(e);
          },
          ...rest,
        },
        children
      );
    },
  };
});

// Mock scrollIntoView and scrollTo in jsdom
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as any;
});
