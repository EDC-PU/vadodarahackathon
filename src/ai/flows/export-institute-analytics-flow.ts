
'use server';

/**
 * @fileOverview Flow to export institute analytics data to an Excel file.
 */

import { ai } from '@/ai/genkit';
import { ExportInstituteAnalyticsInput, ExportInstituteAnalyticsInputSchema, ExportInstituteAnalyticsOutput, ExportInstituteAnalyticsOutputSchema } from '@/lib/types';
import ExcelJS from 'exceljs';

export async function exportInstituteAnalytics(input: ExportInstituteAnalyticsInput): Promise<ExportInstituteAnalyticsOutput> {
    console.log("Executing exportInstituteAnalytics function...");
    return exportInstituteAnalyticsFlow(input);
}

const exportInstituteAnalyticsFlow = ai.defineFlow(
  {
    name: 'exportInstituteAnalyticsFlow',
    inputSchema: ExportInstituteAnalyticsInputSchema,
    outputSchema: ExportInstituteAnalyticsOutputSchema,
  },
  async ({ analyticsData }) => {
    console.log("exportInstituteAnalyticsFlow started...");
    
    if (!analyticsData || analyticsData.length === 0) {
        return { success: false, message: "No analytics data provided to export." };
    }

    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Institute Analytics');

        // Add headers
        sheet.columns = [
            { header: 'Institute', key: 'institute', width: 40 },
            { header: 'Total Registered', key: 'totalRegistered', width: 20, style: { alignment: { horizontal: 'center' } } },
            { header: 'Shortlisted Software', key: 'shortlistedSoftware', width: 20, style: { alignment: { horizontal: 'center' } } },
            { header: 'Registered Software', key: 'registeredSoftware', width: 20, style: { alignment: { horizontal: 'center' } } },
            { header: 'Shortlisted Hardware', key: 'shortlistedHardware', width: 20, style: { alignment: { horizontal: 'center' } } },
            { header: 'Registered Hardware', key: 'registeredHardware', width: 20, style: { alignment: { horizontal: 'center' } } },
            { header: 'Total Shortlisted', key: 'totalShortlisted', width: 20, style: { alignment: { horizontal: 'center' } } },
        ];
        
        // Style the header row
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).alignment = { horizontal: 'center' };

        // Add data rows
        sheet.addRows(analyticsData);
        
        console.log(`Populated ${analyticsData.length} rows of analytics data.`);

        // Generate and return the file
        console.log("Generating final Excel file buffer...");
        const buffer = await workbook.xlsx.writeBuffer();
        const fileContent = Buffer.from(buffer).toString('base64');
        const fileName = `Institute_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`;

        return {
            success: true,
            fileContent,
            fileName,
        };

    } catch (error: any) {
        console.error("Error during Excel export process:", error);
        return { success: false, message: `Export failed: ${error.message}` };
    }
  }
);
