
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
        const templateRow = sheet.getRow(startRow);

        // Remove the placeholder template row if there's actual data to insert.
        // If there's no data, we'll just return the template as is.
        if (teams.length > 0) {
            sheet.spliceRows(startRow, 1);
        }

        teams.forEach((team, index) => {
            const problemStatementCombined = team.problemstatement_id && team.problemstatement_title
                ? `${team.problemstatement_id}, ${team.problemstatement_title}`
                : 'N/A';
            
            // Explicitly set cell values to avoid column shift issues.
            const newRow = sheet.insertRow(startRow + index, []);
            newRow.getCell('A').value = index + 1; // Sr.
            newRow.getCell('B').value = team.universityTeamId || 'N/A'; // Team Number (using university id)
            newRow.getCell('C').value = team.team_name; // Team Name
            newRow.getCell('D').value = team.leader_name; // Lead
            newRow.getCell('E').value = problemStatementCombined; // Problem Statement (Combined)
            newRow.getCell('F').value = team.category || 'N/A'; // Category
            
            // Set empty values for the scores
            newRow.getCell('G').value = null; // Relevance
            newRow.getCell('H').value = null; // Innovation
            newRow.getCell('I').value = null; // Technical
            newRow.getCell('J').value = null; // Feasibility
            newRow.getCell('K').value = null; // Total

            // Apply styles and set row height
            newRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const templateCell = templateRow.getCell(colNumber);
                cell.style = templateCell.style;
                cell.font = templateCell.font;
                // Vertically center the content in each cell
                cell.alignment = { ...templateCell.alignment, vertical: 'middle' };
                cell.border = templateCell.border;
                cell.fill = templateCell.fill;
            });

            // Set the row height to 54
            newRow.height = 54;
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
