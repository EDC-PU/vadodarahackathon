
'use server';
/**
 * @fileOverview Flow to bulk upload problem statements from an Excel file.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import ExcelJS from 'exceljs';
import { ProblemStatement, ProblemStatementCategory, BulkUploadPsInput, BulkUploadPsInputSchema, BulkUploadPsOutput, BulkUploadPsOutputSchema } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';


export async function bulkUploadProblemStatements(input: BulkUploadPsInput): Promise<BulkUploadPsOutput> {
  return bulkUploadPsFlow(input);
}

const bulkUploadPsFlow = ai.defineFlow(
  {
    name: 'bulkUploadPsFlow',
    inputSchema: BulkUploadPsInputSchema,
    outputSchema: BulkUploadPsOutputSchema,
  },
  async ({ fileContent }) => {
    const db = getAdminDb();
    if (!db) {
      return { success: false, message: 'Database connection failed.' };
    }

    let addedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      const buffer = Buffer.from(fileContent, 'base64');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet(1);
      
      if (!worksheet) {
        return { success: false, message: "No worksheet found in the Excel file." };
      }

      const problemStatementsRef = db.collection("problemStatements");
      let batch = db.batch();
      let batchSize = 0;

      const headerRow = worksheet.getRow(1).values as string[];
      const expectedHeaders = ['Statement_id', 'Title', 'Category', 'Technology_Bucket', 'Datasetfile', 'Description', 'Department', 'Organisation'];
      // Simple header validation
      if (JSON.stringify(headerRow.slice(1, expectedHeaders.length + 1)) !== JSON.stringify(expectedHeaders)) {
         errors.push(`Invalid headers. Expected: ${expectedHeaders.join(', ')}. Found: ${(headerRow.slice(1)).join(', ')}`);
         return { success: false, message: 'Excel file headers do not match the expected format.', errors };
      }
      
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        
        const statementId = row.getCell(1).value as string;
        const title = row.getCell(2).value as string;
        const category = row.getCell(3).value as ProblemStatementCategory;
        const theme = row.getCell(4).value as string; // Technology_Bucket
        const datasetLink = row.getCell(5).value ? (row.getCell(5).value as any).text || (row.getCell(5).value as string) : undefined;
        const description = row.getCell(6).value as string;
        const department = row.getCell(7).value as string;
        const organization = row.getCell(8).value as string;
        
        // Validation
        if (!statementId || !title || !category || !theme) {
            errors.push(`Row ${rowNumber}: Missing mandatory fields (Statement_id, Title, Category, Technology_Bucket).`);
            failedCount++;
            continue;
        }

        if (!["Software", "Hardware", "Hardware & Software"].includes(category)) {
            errors.push(`Row ${rowNumber}: Invalid category "${category}". Must be one of "Software", "Hardware", "Hardware & Software".`);
            failedCount++;
            continue;
        }

        const newDocRef = problemStatementsRef.doc();
        batch.set(newDocRef, {
            problemStatementId: statementId,
            title,
            category,
            theme,
            datasetLink: datasetLink || '',
            description: description || '',
            department: department || '',
            organization: organization || '',
            createdAt: FieldValue.serverTimestamp(),
        });
        addedCount++;
        batchSize++;

        if (batchSize >= 400) { // Firestore batch limit is 500
            await batch.commit();
            batchSize = 0;
            // Re-initialize batch after commit
            batch = db.batch();
        }
      }

      if (batchSize > 0) {
        await batch.commit();
      }

      return {
        success: true,
        message: `Bulk upload completed. Added: ${addedCount}, Failed: ${failedCount}.`,
        addedCount,
        failedCount,
        errors,
      };

    } catch (error: any) {
      console.error("Error during bulk upload:", error);
      return { success: false, message: `An error occurred: ${error.message}` };
    }
  }
);
