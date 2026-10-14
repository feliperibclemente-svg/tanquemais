import { useState } from "react";
import { SelectField, TextField } from "@/components/ds/field";
import { BRANDS, matchFrom, modelsOf } from "@/constants/vehicles";

const OTHER = "__outro";

/**
 * Marca e modelo por lista, com saída para digitação livre ("Outra marca" / "Outro modelo").
 * Padroniza os nomes para as análises sem impedir o cadastro de veículos fora do catálogo.
 */
export function BrandModelFields({
  brand,
  model,
  onChange,
}: {
  brand: string;
  model: string;
  onChange: (next: { brand: string; model: string }) => void;
}) {
  const catalogBrand = matchFrom(BRANDS, brand);
  const models = catalogBrand ? modelsOf(catalogBrand) : [];
  const catalogModel = catalogBrand ? matchFrom(models, model) : null;

  const [customBrand, setCustomBrand] = useState(!!brand && !catalogBrand);
  const [customModel, setCustomModel] = useState(!!model && !!catalogBrand && !catalogModel);

  const brandValue = customBrand ? OTHER : (catalogBrand ?? "");
  const modelValue = customModel ? OTHER : (catalogModel ?? "");

  return (
    <div className="space-y-3">
      <SelectField
        label="Marca"
        value={brandValue}
        onChange={(event) => {
          const value = event.target.value;
          setCustomModel(false);
          if (value === OTHER) {
            setCustomBrand(true);
            onChange({ brand: "", model: "" });
            return;
          }
          setCustomBrand(false);
          onChange({ brand: value, model: "" });
        }}
        options={[
          { value: "", label: "Escolha a marca" },
          ...BRANDS.map((b) => ({ value: b, label: b })),
          { value: OTHER, label: "Outra marca" },
        ]}
      />

      {customBrand ? (
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Qual marca?"
            value={brand}
            onChange={(event) => onChange({ brand: event.target.value, model })}
          />
          <TextField
            label="Modelo"
            value={model}
            onChange={(event) => onChange({ brand, model: event.target.value })}
          />
        </div>
      ) : catalogBrand ? (
        <>
          <SelectField
            label="Modelo"
            value={modelValue}
            onChange={(event) => {
              const value = event.target.value;
              if (value === OTHER) {
                setCustomModel(true);
                onChange({ brand: catalogBrand, model: "" });
                return;
              }
              setCustomModel(false);
              onChange({ brand: catalogBrand, model: value });
            }}
            options={[
              { value: "", label: "Escolha o modelo" },
              ...models.map((m) => ({ value: m, label: m })),
              { value: OTHER, label: "Outro modelo" },
            ]}
          />
          {customModel ? (
            <TextField
              label="Qual modelo?"
              value={model}
              onChange={(event) => onChange({ brand: catalogBrand, model: event.target.value })}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
