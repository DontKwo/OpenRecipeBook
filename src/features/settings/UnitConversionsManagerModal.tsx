import { useState, useMemo, type FC, type ReactElement, type ChangeEvent, type FormEvent } from "react";
import {
  BUILT_IN_UNIT_DEFINITIONS,
  getEffectiveUnitDefinitions
} from "../../domain/scaling/universalConverter";
import { DENSITY_TABLE, getEffectiveDensityTable } from "../../domain/scaling/density";
import {
  getConversionConfig,
  saveUnitOverride,
  removeUnitConversion,
  restoreUnitDefault,
  saveDensityOverride,
  removeDensityConversion,
  restoreDensityDefault,
  resetConversionsToDefault,
  type CustomUnitDefinition,
  type ConversionOverrideState
} from "../../domain/scaling/customConversions";
import { Dialog } from "../../ui/Dialog";
import { Button, IconButton } from "../../ui/Button";
import { ConvertIcon, PlusIcon, TrashIcon, HistoryIcon } from "../../ui/icons";
import { useToast } from "../../ui/Toast";

export interface UnitConversionsManagerModalProps {
  onClose: () => void;
}

export const UnitConversionsManagerModal: FC<UnitConversionsManagerModalProps> = ({
  onClose
}): ReactElement => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"units" | "densities">("units");
  const [config, setConfig] = useState<ConversionOverrideState>(() => getConversionConfig());
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Unit form state (used for adding or editing a unit)
  const [showUnitForm, setShowUnitForm] = useState<boolean>(false);
  const [unitKey, setUnitKey] = useState<string>("");
  const [unitLabel, setUnitLabel] = useState<string>("");
  const [unitFamily, setUnitFamily] = useState<"volume" | "weight">("volume");
  const [unitToBase, setUnitToBase] = useState<string>("");
  const [unitAliases, setUnitAliases] = useState<string>("");

  // Density form state
  const [showDensityForm, setShowDensityForm] = useState<boolean>(false);
  const [densityKey, setDensityKey] = useState<string>("");
  const [densityName, setDensityName] = useState<string>("");
  const [densityCategory, setDensityCategory] = useState<string>("Custom");
  const [densityValue, setDensityValue] = useState<string>("");
  const [densityAliases, setDensityAliases] = useState<string>("");
  const [densitySource, setDensitySource] = useState<string>("User Custom Value");

  const effectiveUnits = useMemo((): CustomUnitDefinition[] => {
    void config;
    return getEffectiveUnitDefinitions();
  }, [config]);

  const effectiveDensities = useMemo(() => {
    void config;
    return getEffectiveDensityTable();
  }, [config]);

  const filteredUnits = useMemo((): CustomUnitDefinition[] => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return effectiveUnits;
    return effectiveUnits.filter((u: CustomUnitDefinition): boolean => {
      return (
        u.key.toLowerCase().includes(q) ||
        u.label.toLowerCase().includes(q) ||
        u.aliases.some((a: string): boolean => a.toLowerCase().includes(q))
      );
    });
  }, [effectiveUnits, searchQuery]);

  const filteredDensities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const entries = Object.entries(effectiveDensities);
    if (!q) return entries;
    return entries.filter(([key, rec]): boolean => {
      return (
        key.toLowerCase().includes(q) ||
        rec.name.toLowerCase().includes(q) ||
        rec.category.toLowerCase().includes(q) ||
        (rec.aliases || []).some((a: string): boolean => a.toLowerCase().includes(q))
      );
    });
  }, [effectiveDensities, searchQuery]);

  const handleEditUnit = (unit: CustomUnitDefinition): void => {
    setUnitKey(unit.key);
    setUnitLabel(unit.label);
    setUnitFamily(unit.family);
    setUnitToBase(String(unit.toBase));
    setUnitAliases(unit.aliases.join(", "));
    setShowUnitForm(true);
  };

  const handleSaveUnit = (e: FormEvent): void => {
    e.preventDefault();
    const baseNum = parseFloat(unitToBase);
    if (!unitKey.trim() || !Number.isFinite(baseNum) || baseNum <= 0) return;

    const cleanKey = unitKey.trim().toLowerCase();
    const isBuiltIn = BUILT_IN_UNIT_DEFINITIONS.some((u) => u.key.toLowerCase() === cleanKey);
    const nextState = saveUnitOverride({
      key: cleanKey,
      label: unitLabel.trim() || cleanKey,
      family: unitFamily,
      toBase: baseNum,
      aliases: unitAliases
        .split(",")
        .map((a: string): string => a.trim())
        .filter(Boolean),
      isBuiltIn,
      source: "User Override"
    });
    setConfig(nextState);
    setShowUnitForm(false);
    setUnitKey("");
    setUnitLabel("");
    setUnitToBase("");
    setUnitAliases("");
    showToast(`Saved conversion for "${cleanKey}"`);
  };

  const handleEditDensity = (key: string): void => {
    const rec = effectiveDensities[key];
    if (!rec) return;
    setDensityKey(key);
    setDensityName(rec.name);
    setDensityCategory(rec.category);
    setDensityValue(String(rec.gramsPerMl));
    setDensityAliases((rec.aliases || []).join(", "));
    setDensitySource("User Override");
    setShowDensityForm(true);
  };

  const handleSaveDensity = (e: FormEvent): void => {
    e.preventDefault();
    const gramsNum = parseFloat(densityValue);
    if (!densityName.trim() || !Number.isFinite(gramsNum) || gramsNum <= 0) return;
    const key = (densityKey.trim() || densityName.trim()).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const isBuiltIn = key in DENSITY_TABLE;
    const nextState = saveDensityOverride({
      key,
      name: densityName.trim(),
      category: densityCategory.trim() || "Custom",
      gramsPerMl: gramsNum,
      source: densitySource.trim() || "User Override",
      aliases: densityAliases
        .split(",")
        .map((a: string): string => a.trim())
        .filter(Boolean),
      isBuiltIn
    });
    setConfig(nextState);
    setShowDensityForm(false);
    setDensityKey("");
    setDensityName("");
    setDensityValue("");
    setDensityAliases("");
    showToast(`Saved density for "${densityName.trim()}"`);
  };

  const handleResetAll = (): void => {
    const fresh = resetConversionsToDefault();
    setConfig(fresh);
    showToast("All unit and density conversions reset to NIST / USDA / King Arthur defaults");
  };

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <ConvertIcon width={20} height={20} />
          Unit & Density Conversions
        </span>
      }
      maxWidth={720}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: 8 }}>
          <Button
            type="button"
            variant="danger"
            size="sm"
            icon={<HistoryIcon width={14} height={14} />}
            onClick={handleResetAll}
          >
            Reset All to Default
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted)" }}>
          Override built-in NIST volume/weight factors or USDA/King Arthur ingredient densities, add your own units (like butter sticks or regional spoons), or remove entries you do not use.
        </p>

        {/* Tabs & Search */}
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
          <Button
            type="button"
            variant={activeTab === "units" ? "primary" : "secondary"}
            size="sm"
            onClick={(): void => setActiveTab("units")}
          >
            Volume & Weight Units ({effectiveUnits.length})
          </Button>
          <Button
            type="button"
            variant={activeTab === "densities" ? "primary" : "secondary"}
            size="sm"
            onClick={(): void => setActiveTab("densities")}
          >
            Ingredient Densities ({Object.keys(effectiveDensities).length})
          </Button>
          <input
            type="search"
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>): void => setSearchQuery(e.target.value)}
            placeholder="Filter conversions..."
            style={{
              flex: 1,
              minWidth: 160,
              padding: "6px 12px",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: "0.875rem"
            }}
          />
        </div>

        {/* UNITS TAB */}
        {activeTab === "units" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
                Base units: ml (volume), g (weight)
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<PlusIcon width={14} height={14} />}
                onClick={(): void => {
                  setUnitKey("");
                  setUnitLabel("");
                  setUnitFamily("volume");
                  setUnitToBase("");
                  setUnitAliases("");
                  setShowUnitForm(!showUnitForm);
                }}
              >
                Add / Override Unit
              </Button>
            </div>

            {showUnitForm && (
              <form
                onSubmit={handleSaveUnit}
                style={{
                  background: "var(--surface-alt)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)"
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600 }}>Unit Key *</label>
                    <input
                      required
                      type="text"
                      value={unitKey}
                      onChange={(e: ChangeEvent<HTMLInputElement>): void => setUnitKey(e.target.value)}
                      placeholder="e.g. stick, cup, pinch"
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600 }}>Display Name</label>
                    <input
                      type="text"
                      value={unitLabel}
                      onChange={(e: ChangeEvent<HTMLInputElement>): void => setUnitLabel(e.target.value)}
                      placeholder="e.g. Butter Stick"
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600 }}>Family</label>
                    <select
                      value={unitFamily}
                      onChange={(e: ChangeEvent<HTMLSelectElement>): void => setUnitFamily(e.target.value as "volume" | "weight")}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}
                    >
                      <option value="volume">Volume (base: ml)</option>
                      <option value="weight">Weight (base: g)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600 }}>
                      {unitFamily === "volume" ? "ml per 1 unit *" : "g per 1 unit *"}
                    </label>
                    <input
                      required
                      type="number"
                      step="any"
                      min="0.0001"
                      value={unitToBase}
                      onChange={(e: ChangeEvent<HTMLInputElement>): void => setUnitToBase(e.target.value)}
                      placeholder={unitFamily === "volume" ? "e.g. 236.588" : "e.g. 28.35"}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600 }}>Aliases (comma separated)</label>
                  <input
                    type="text"
                    value={unitAliases}
                    onChange={(e: ChangeEvent<HTMLInputElement>): void => setUnitAliases(e.target.value)}
                    placeholder="e.g. sticks, butter stick"
                    style={{ width: "100%", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={(): void => setShowUnitForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                  >
                    Save Unit
                  </Button>
                </div>
              </form>
            )}

            <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredUnits.map((unit: CustomUnitDefinition): ReactElement => {
                const isOverridden = Boolean(config.units[unit.key.toLowerCase()]);
                const baseLabel = unit.family === "volume" ? "ml" : "g";
                return (
                  <div
                    key={unit.key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      background: "var(--surface-alt)"
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span>{unit.key}</span>
                        <span style={{ fontWeight: 400, color: "var(--muted)" }}>{unit.label}</span>
                        {isOverridden && (
                          <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "var(--radius-full)", background: "var(--accent)", color: "var(--accent-contrast)" }}>
                            Custom / Override
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        1 {unit.key} = {Number(unit.toBase.toFixed(5))} {baseLabel} · {unit.source || "Standard"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={(): void => handleEditUnit(unit)}
                      >
                        Edit
                      </Button>
                      {isOverridden && unit.isBuiltIn && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(): void => {
                            setConfig(restoreUnitDefault(unit.key));
                            showToast(`Restored default for "${unit.key}"`);
                          }}
                        >
                          Revert
                        </Button>
                      )}
                      <IconButton
                        icon={<TrashIcon width={14} height={14} />}
                        aria-label={`Remove unit ${unit.key}`}
                        size="sm"
                        onClick={(): void => {
                          setConfig(removeUnitConversion(unit.key));
                          showToast(`Removed unit "${unit.key}"`);
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {config.disabledUnits.length > 0 && (
                <div style={{ paddingTop: 8, borderTop: "1px solid var(--border)", fontSize: "0.8125rem", color: "var(--muted)", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  <span>Removed units:</span>
                  {config.disabledUnits.map((key: string): ReactElement => (
                    <Button
                      key={key}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(): void => {
                        setConfig(restoreUnitDefault(key));
                        showToast(`Restored unit "${key}"`);
                      }}
                    >
                      Restore {key}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DENSITIES TAB */}
        {activeTab === "densities" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
                Density in grams per milliliter (1 US cup = 236.59 ml)
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<PlusIcon width={14} height={14} />}
                onClick={(): void => {
                  setDensityKey("");
                  setDensityName("");
                  setDensityCategory("Custom");
                  setDensityValue("");
                  setDensityAliases("");
                  setDensitySource("User Custom Value");
                  setShowDensityForm(!showDensityForm);
                }}
              >
                Add / Override Density
              </Button>
            </div>

            {showDensityForm && (
              <form
                onSubmit={handleSaveDensity}
                style={{
                  background: "var(--surface-alt)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)"
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600 }}>Ingredient Name *</label>
                    <input
                      required
                      type="text"
                      value={densityName}
                      onChange={(e: ChangeEvent<HTMLInputElement>): void => setDensityName(e.target.value)}
                      placeholder="e.g. Matcha Powder"
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600 }}>Density (g/ml) *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0.05"
                      value={densityValue}
                      onChange={(e: ChangeEvent<HTMLInputElement>): void => setDensityValue(e.target.value)}
                      placeholder="e.g. 0.42"
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600 }}>Category</label>
                    <input
                      type="text"
                      value={densityCategory}
                      onChange={(e: ChangeEvent<HTMLInputElement>): void => setDensityCategory(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600 }}>Aliases (comma separated)</label>
                    <input
                      type="text"
                      value={densityAliases}
                      onChange={(e: ChangeEvent<HTMLInputElement>): void => setDensityAliases(e.target.value)}
                      placeholder="e.g. green tea powder"
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600 }}>Source / Note</label>
                    <input
                      type="text"
                      value={densitySource}
                      onChange={(e: ChangeEvent<HTMLInputElement>): void => setDensitySource(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={(): void => setShowDensityForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                  >
                    Save Density
                  </Button>
                </div>
              </form>
            )}

            <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredDensities.map(([key, rec]): ReactElement => {
                const isOverridden = Boolean(config.densities[key]);
                const cupGrams = Math.round(rec.gramsPerMl * 236.588);
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      background: "var(--surface-alt)"
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span>{rec.name}</span>
                        {isOverridden && (
                          <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "var(--radius-full)", background: "var(--accent)", color: "var(--accent-contrast)" }}>
                            Custom / Override
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        {rec.gramsPerMl} g/ml (~{cupGrams} g/cup) · {rec.category} · {rec.source}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={(): void => handleEditDensity(key)}
                      >
                        Edit
                      </Button>
                      {isOverridden && key in DENSITY_TABLE && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(): void => {
                            setConfig(restoreDensityDefault(key));
                            showToast(`Restored default density for "${rec.name}"`);
                          }}
                        >
                          Revert
                        </Button>
                      )}
                      <IconButton
                        icon={<TrashIcon width={14} height={14} />}
                        aria-label={`Remove density ${rec.name}`}
                        size="sm"
                        onClick={(): void => {
                          setConfig(removeDensityConversion(key));
                          showToast(`Removed density "${rec.name}"`);
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {config.disabledDensities.length > 0 && (
                <div style={{ paddingTop: 8, borderTop: "1px solid var(--border)", fontSize: "0.8125rem", color: "var(--muted)", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  <span>Removed densities:</span>
                  {config.disabledDensities.map((key: string): ReactElement => (
                    <Button
                      key={key}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(): void => {
                        setConfig(restoreDensityDefault(key));
                        showToast(`Restored "${key}"`);
                      }}
                    >
                      Restore {key}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
