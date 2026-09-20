import * as React from "react";
import { cn } from "@/lib/utils";

export type TableResponsiveMode = "stack" | "scroll" | "none";

interface TableContextValue {
  responsive: TableResponsiveMode;
}

const TableContext = React.createContext<TableContextValue>({
  responsive: "stack",
});

export interface TableContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  responsive?: TableResponsiveMode;
}

export const TableContainer = React.forwardRef<
  HTMLDivElement,
  TableContainerProps
>(({ className, responsive = "stack", children, ...props }, ref) => (
  <TableContext.Provider value={{ responsive }}>
    <div
      ref={ref}
      className={cn(
        "w-full min-w-0 max-w-full",
        responsive === "scroll" &&
          "overflow-x-auto rounded-xl border border-[#EAE3D9] bg-white",
        responsive === "stack" &&
          "rounded-xl border border-[#EAE3D9] bg-white overflow-hidden md:overflow-x-auto",
        responsive === "none" &&
          "rounded-xl border border-[#EAE3D9] bg-white",
        className
      )}
      {...props}
    >
      {children}
    </div>
  </TableContext.Provider>
));
TableContainer.displayName = "TableContainer";

export interface TableProps
  extends React.TableHTMLAttributes<HTMLTableElement> {
  responsive?: TableResponsiveMode;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, responsive, children, ...props }, ref) => {
    const parentContext = React.useContext(TableContext);
    const activeResponsive = responsive ?? parentContext.responsive;

    return (
      <TableContext.Provider value={{ responsive: activeResponsive }}>
        <table
          ref={ref}
          className={cn(
            "w-full caption-bottom text-sm border-collapse",
            activeResponsive === "stack" && "block md:table",
            className
          )}
          {...props}
        >
          {children}
        </table>
      </TableContext.Provider>
    );
  }
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  const { responsive } = React.useContext(TableContext);

  return (
    <thead
      ref={ref}
      className={cn(
        "bg-[#FAF5EE]/70 border-b border-[#EAE3D9]",
        responsive === "stack" && "hidden md:table-header-group",
        className
      )}
      {...props}
    />
  );
});
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  const { responsive } = React.useContext(TableContext);

  return (
    <tbody
      ref={ref}
      className={cn(
        "[&_tr:last-child]:border-0",
        responsive === "stack" &&
          "block md:table-row-group p-3 sm:p-4 md:p-0 space-y-3 md:space-y-0",
        className
      )}
      {...props}
    />
  );
});
TableBody.displayName = "TableBody";

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "bg-[#FAF5EE] border-t border-[#EAE3D9] font-medium",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => {
  const { responsive } = React.useContext(TableContext);

  return (
    <tr
      ref={ref}
      className={cn(
        "transition-colors",
        responsive === "stack"
          ? "block md:table-row rounded-xl border border-[#EAE3D9] md:border-0 md:border-b md:border-[#F3ECE2] bg-[#FAF5EE]/35 md:bg-transparent p-3.5 sm:p-4 md:p-0 space-y-2 md:space-y-0 hover:bg-[#FAF5EE]/70 md:hover:bg-[#FAF5EE]/50"
          : "border-b border-[#F3ECE2] hover:bg-[#FAF5EE]/50 data-[state=selected]:bg-[#F9EFE5]",
        className
      )}
      {...props}
    />
  );
});
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-[#7A746F]",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  label?: string;
  isAction?: boolean;
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, label, isAction, children, ...props }, ref) => {
    const { responsive } = React.useContext(TableContext);
    const actionCell = isAction ?? (label?.toLowerCase() === "action");

    if (responsive === "stack") {
      return (
        <td
          ref={ref}
          data-label={label}
          className={cn(
            "text-[#201C1A] align-middle",
            actionCell
              ? "block md:table-cell pt-2.5 mt-2 border-t border-[#EAE3D9]/60 md:border-t-0 md:p-4 text-right"
              : "flex items-start justify-between gap-3 py-1.5 md:table-cell md:p-4 text-xs md:text-sm",
            className
          )}
          {...props}
        >
          {label && !actionCell && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7A746F] md:hidden shrink-0 pt-0.5 select-none">
              {label}
            </span>
          )}
          <div
            className={cn(
              "min-w-0 max-w-full break-words",
              !actionCell && "text-right md:text-left",
              actionCell && "w-full flex justify-end"
            )}
          >
            {children}
          </div>
        </td>
      );
    }

    return (
      <td
        ref={ref}
        data-label={label}
        className={cn("p-4 align-middle text-[#201C1A]", className)}
        {...props}
      >
        {children}
      </td>
    );
  }
);
TableCell.displayName = "TableCell";

export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-xs text-[#7A746F]", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";
