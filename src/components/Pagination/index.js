'use client';
import React from 'react';
import styles from './Pagination.module.scss';
import Link from 'next/link';
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";
import { usePathname, useSearchParams } from "next/navigation";

const Pagination = ({ rows, page, pages, hash='' }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildHref = (targetPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', targetPage);
    return `${pathname}?${params.toString()}${hash || ''}`;
  };

  const renderPageButtons = () => {
    const maxVisibleButtons = 5; // Maximum number of buttons to display
    const pageButtons = [];
    const startPage = Math.max(1, page - Math.floor(maxVisibleButtons / 2));
    const endPage = Math.min(pages, startPage + maxVisibleButtons - 1);

    if (startPage > 1) {
      pageButtons.push(
        <Link
          key={1}
          className={styles.pageButton}
          href={buildHref(1)}
        >
          1
        </Link>
      );
      if (startPage > 2) {
        pageButtons.push(
          <span key="startEllipsis" className={styles.ellipsis}>...</span>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <Link
          key={i}
          className={`${styles.pageButton} ${i === page ? styles.active : ''}`}
          href={buildHref(i)}
        >
          {i}
        </Link>
      );
    }

    if (endPage < pages) {
      if (endPage < pages - 1) {
        pageButtons.push(
          <span key="endEllipsis" className={styles.ellipsis}>...</span>
        );
      }
      pageButtons.push(
        <Link
          key={pages}
          className={styles.pageButton}
          href={buildHref(pages)}
        >
          {pages}
        </Link>
      );
    }

    return pageButtons;
  };

  return (
    <div className={styles.paginationControls}>
      {
        page <= 1 ? <div className={styles.disabled}><FaAngleLeft /></div> : <Link
          className={styles.controlButton}
          href={buildHref(page-1)}
        >
          <FaAngleLeft />
        </Link>
      }
        
      {renderPageButtons()}

      {
        page >= pages ? <div className={styles.disabled}><FaAngleRight /></div> : <Link
          className={styles.controlButton}
          href={buildHref(page+1)}
        >
          <FaAngleRight />
        </Link>
      }
    </div>
  );
};

export default Pagination;