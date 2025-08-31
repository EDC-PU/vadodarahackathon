
'use server';

/**
 * @fileOverview Flow to export team evaluation data to an Excel file using a template.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { Team, ExportEvaluationInput, ExportEvaluationInputSchema, ExportEvaluationOutput, ExportEvaluationOutputSchema } from '@/lib/types';
import ExcelJS from 'exceljs';
import path from 'path';

export async function exportEvaluation(input: ExportEvaluationInput): Promise<ExportEvaluationOutput> {
    console.log("Executing exportEvaluation function...");
    return exportEvaluationFlow(input);
}

const exportEvaluationFlow = ai.defineFlow(
  {
    name: 'exportEvaluationFlow',
    inputSchema: ExportEvaluationInputSchema,
    outputSchema: ExportEvaluationOutputSchema,
  },
  async ({ instituteName, teams }) => {
    console.log("exportEvaluationFlow started for institute:", instituteName);
    const db = getAdminDb();
    if (!db) {
        return { success: false, message: "Database connection failed." };
    }

    try {
        // 1. Load ExcelJS Template
        console.log("Step 1: Loading Excel template...");
        const templatePath = path.join(process.cwd(), 'src', 'templates', 'Evaluation.xlsx');
        const workbook = new ExcelJS.Workbook();
        try {
            await workbook.xlsx.readFile(templatePath);
        } catch (error: any) {
             console.error(`Error reading template file at ${templatePath}:`, error);
             return { success: false, message: `Could not load the Excel template file. Make sure 'Evaluation.xlsx' exists in the 'src/templates' directory. Error: ${error.message}` };
        }
        
        const sheet = workbook.getWorksheet(1);
        if (!sheet) {
             return { success: false, message: "Could not find a worksheet in the template file."};
        }

        // 2. Replace Header Placeholder
        sheet.findCell('D4')!.value = instituteName;
        console.log("Step 2: Replaced institute name placeholder.");

        // 3. Populate Workbook with Data
        console.log("Step 3: Populating workbook with team data...");
        let srNumber = 1;
        let currentRowIndex = 8; // Starting row for data

        for (const team of teams) {
            const row = sheet.getRow(currentRowIndex);
            row.values = [
                srNumber++,
                team.team_id,
                team.team_name,
                team.leader_name,
                team.problemstatement_id,
                team.problemstatement_title
            ];
            // If there are more teams than rows in the template, insert a new row
            if (currentRowIndex > 8) {
                sheet.duplicateRow(currentRowIndex - 1, 1, true);
            }
            currentRowIndex++;
        }
        console.log(`Populated ${teams.length} teams.`);


        // 4. Generate and return the file
        console.log("Step 4: Generating final Excel file buffer...");
        const buffer = await workbook.xlsx.writeBuffer();
        const fileContent = Buffer.from(buffer).toString('base64');
        const fileName = `${instituteName}_Evaluation.xlsx`;

        return {
            success: true,
            fileContent,
            fileName,
        };

    } catch (error: any) {
        console.error("Error during Excel export process:", error);
        let errorMessage = "An unknown error occurred during the export.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, message: `Export failed: ${errorMessage}` };
    }
  }
);
