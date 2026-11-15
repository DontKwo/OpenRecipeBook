import type { FC, ReactElement, ChangeEvent } from "react";
import type { SortField } from "../../domain/recipe/search";
import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";
import { Chip } from "../../ui/Chip";
import { FilterIcon } from "../../ui/icons";

export interface RecipeFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  sortBy: SortField;
  onSortChange: (sort: SortField) => void;
  selectedCourse: string;
  onCourseChange: (course: string) => void;
  availableCourses: string[];
  minRating: number;
  onMinRatingChange: (rating: number) => void;
  maxMinutes: number | undefined;
  onMaxMinutesChange: (minutes: number | undefined) => void;
  onlyHasPhoto: boolean;
  onOnlyHasPhotoChange: (hasPhoto: boolean) => void;
  onResetFilters: () => void;
}

export const RecipeFilterModal: FC<RecipeFilterModalProps> = ({
  isOpen,
  onClose,
  sortBy,
  onSortChange,
  selectedCourse,
  onCourseChange,
  availableCourses,
  minRating,
  onMinRatingChange,
  maxMinutes,
  onMaxMinutesChange,
  onlyHasPhoto,
  onOnlyHasPhotoChange,
  onResetFilters
}): ReactElement => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <FilterIcon width={20} height={20} />
          Filter & Sort Recipes
        </span>
      }
      maxWidth={480}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8 }}>
          <Button
            variant="ghost"
            onClick={onResetFilters}
          >
            Reset All
          </Button>
          <Button
            variant="primary"
            onClick={onClose}
          >
            Apply Filters
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {/* Sort by */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>
            Sort by
          </label>
          <select
            value={sortBy}
            onChange={(e: ChangeEvent<HTMLSelectElement>): void => onSortChange(e.target.value as SortField)}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: "0.9375rem"
            }}
          >
            <option value="recentAdded">Recently Added</option>
            <option value="recentEdited">Recently Edited</option>
            <option value="title">Title (A-Z)</option>
            <option value="rating">Highest Rated</option>
            <option value="totalTime">Shortest Time</option>
          </select>
        </div>

        {/* Course */}
        {availableCourses.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>
              Course
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <Chip
                label="All Courses"
                selected={!selectedCourse}
                onClick={(): void => onCourseChange("")}
              />
              {availableCourses.map((c: string): ReactElement => (
                <Chip
                  key={c}
                  label={c}
                  selected={selectedCourse === c}
                  onClick={(): void => onCourseChange(selectedCourse === c ? "" : c)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Minimum Rating */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>
            Minimum Rating
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              { label: "Any", value: 0 },
              { label: "3+ Stars", value: 3 },
              { label: "4+ Stars", value: 4 },
              { label: "5 Stars", value: 5 }
            ].map((option): ReactElement => (
              <Chip
                key={option.value}
                label={option.label}
                selected={minRating === option.value}
                onClick={(): void => onMinRatingChange(option.value)}
              />
            ))}
          </div>
        </div>

        {/* Maximum Time */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>
            Max Preparation & Cook Time
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              { label: "Any Time", value: undefined },
              { label: "<= 15 min", value: 15 },
              { label: "<= 30 min", value: 30 },
              { label: "<= 45 min", value: 45 },
              { label: "<= 60 min", value: 60 }
            ].map((option): ReactElement => (
              <Chip
                key={option.label}
                label={option.label}
                selected={maxMinutes === option.value}
                onClick={(): void => onMaxMinutesChange(option.value)}
              />
            ))}
          </div>
        </div>

        {/* Has Photo toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.9375rem" }}>
          <input
            type="checkbox"
            checked={onlyHasPhoto}
            onChange={(e: ChangeEvent<HTMLInputElement>): void => onOnlyHasPhotoChange(e.target.checked)}
            style={{ width: 16, height: 16, cursor: "pointer" }}
          />
          <span>Only show recipes with photos</span>
        </label>
      </div>
    </Dialog>
  );
};
