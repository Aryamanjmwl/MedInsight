from dataclasses import dataclass


@dataclass(frozen=True)
class BiomarkerDefinition:
    normalized_name: str
    display_name: str
    aliases: tuple[str, ...]


BIOMARKERS: tuple[BiomarkerDefinition, ...] = (
    BiomarkerDefinition("hemoglobin", "Hemoglobin", ("hemoglobin", "haemoglobin", "hgb", "hb")),
    BiomarkerDefinition("hematocrit", "Hematocrit", ("hematocrit", "haematocrit", "hct", "packed cell volume", "pcv")),
    BiomarkerDefinition("rbc", "Red Blood Cell Count", ("red blood cell count", "red blood cells", "erythrocytes", "rbc")),
    BiomarkerDefinition("wbc", "White Blood Cell Count", ("white blood cell count", "white blood cells", "leukocytes", "leucocytes", "wbc")),
    BiomarkerDefinition("platelets", "Platelets", ("platelet count", "platelets", "plt")),
    BiomarkerDefinition("mcv", "Mean Corpuscular Volume", ("mean corpuscular volume", "mcv")),
    BiomarkerDefinition("mch", "Mean Corpuscular Hemoglobin", ("mean corpuscular hemoglobin", "mean corpuscular haemoglobin", "mch")),
    BiomarkerDefinition("mchc", "Mean Corpuscular Hemoglobin Concentration", ("mean corpuscular hemoglobin concentration", "mean corpuscular haemoglobin concentration", "mchc")),
    BiomarkerDefinition("glucose", "Glucose", ("fasting blood glucose", "fasting glucose", "serum glucose", "blood glucose", "glucose")),
    BiomarkerDefinition("creatinine", "Creatinine", ("serum creatinine", "creatinine", "creat.")),
    BiomarkerDefinition("egfr", "eGFR", ("estimated glomerular filtration rate", "egfr")),
    BiomarkerDefinition("urea", "Urea", ("serum urea", "urea")),
    BiomarkerDefinition("bun", "Blood Urea Nitrogen", ("blood urea nitrogen", "bun")),
    BiomarkerDefinition("sodium", "Sodium", ("serum sodium", "sodium")),
    BiomarkerDefinition("potassium", "Potassium", ("serum potassium", "potassium")),
    BiomarkerDefinition("chloride", "Chloride", ("serum chloride", "chloride")),
    BiomarkerDefinition("calcium", "Calcium", ("serum calcium", "calcium")),
    BiomarkerDefinition("alt", "ALT", ("alanine aminotransferase", "alanine transaminase", "sgpt", "alt")),
    BiomarkerDefinition("ast", "AST", ("aspartate aminotransferase", "aspartate transaminase", "sgot", "ast")),
    BiomarkerDefinition("alp", "Alkaline Phosphatase", ("alkaline phosphatase", "alp")),
    BiomarkerDefinition("ggt", "Gamma-Glutamyl Transferase", ("gamma-glutamyl transferase", "gamma glutamyl transferase", "ggt")),
    BiomarkerDefinition("total_bilirubin", "Total Bilirubin", ("bilirubin, total", "total bilirubin")),
    BiomarkerDefinition("direct_bilirubin", "Direct Bilirubin", ("bilirubin, direct", "direct bilirubin")),
    BiomarkerDefinition("albumin", "Albumin", ("serum albumin", "albumin")),
    BiomarkerDefinition("total_protein", "Total Protein", ("serum total protein", "total protein")),
    BiomarkerDefinition("total_cholesterol", "Total Cholesterol", ("cholesterol, total", "total cholesterol", "cholesterol")),
    BiomarkerDefinition("ldl_cholesterol", "LDL Cholesterol", ("low-density lipoprotein cholesterol", "low density lipoprotein", "ldl cholesterol", "ldl-c", "ldl")),
    BiomarkerDefinition("hdl_cholesterol", "HDL Cholesterol", ("high-density lipoprotein cholesterol", "high density lipoprotein", "hdl cholesterol", "hdl-c", "hdl")),
    BiomarkerDefinition("triglycerides", "Triglycerides", ("triglycerides", "triglyceride", "tg")),
    BiomarkerDefinition("hba1c", "HbA1c", ("glycated hemoglobin", "glycated haemoglobin", "hemoglobin a1c", "haemoglobin a1c", "hba1c", "a1c")),
    BiomarkerDefinition("crp", "C-Reactive Protein", ("c-reactive protein", "c reactive protein", "crp")),
    BiomarkerDefinition("tsh", "TSH", ("thyroid stimulating hormone", "thyrotropin", "tsh")),
    BiomarkerDefinition("ferritin", "Ferritin", ("serum ferritin", "ferritin")),
    BiomarkerDefinition("iron", "Serum Iron", ("serum iron", "iron")),
    BiomarkerDefinition("vitamin_b12", "Vitamin B12", ("vitamin b12", "cobalamin", "b12")),
    BiomarkerDefinition("vitamin_d", "Vitamin D", ("vitamin d, 25-hydroxy", "25-hydroxy vitamin d", "25-oh vitamin d", "vitamin d")),
)

BIOMARKERS_BY_NORMALIZED_NAME = {
    definition.normalized_name: definition for definition in BIOMARKERS
}
