
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
        // 1. Load ExcelJS Template from URL
        console.log("Step 1: Loading Excel template from URL...");
        const templateUrl = "https://mnaignsupdlayf72.public.blob.vercel-storage.com/Evaluation.xlsx";
        const workbook = new ExcelJS.Workbook();
        
        try {
            const response = await fetch(templateUrl);
            if (!response.ok) {
                throw new Error(`Failed to download template: ${response.statusText}`);
            }
            const buffer = await response.arrayBuffer();
            await workbook.xlsx.load(buffer);
        } catch (error: any) {
             console.error(`Error reading template file from ${templateUrl}:`, error);
             return { success: false, message: `Could not load the Excel template file from the URL. Error: ${error.message}` };
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
        const startRow = 8;
        
        teams.forEach((team, index) => {
            const currentRow = startRow + index;
            const row = sheet.getRow(currentRow);
            
            row.getCell('B').value = index + 1; // sr
            row.getCell('C').value = team.team_name; // team_name
            row.getCell('D').value = team.leader_name; // leader_name
            row.getCell('E').value = team.team_id; // team_id
            row.getCell('F').value = team.problemstatement_id; // problemstatement_id
            row.getCell('G').value = team.problemstatement_title; // problemstatement_title
            
            // To ensure subsequent rows exist with the same styling, we duplicate the template row
            // *before* writing the next record, but only if there are more records to write.
            if (index < teams.length - 1) {
                sheet.duplicateRow(currentRow, 1, true);
            }
        });

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
