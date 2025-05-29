# Swiss Legal QA App

A Next.js application that provides answers to legal questions based on the Swiss Civil Code, using OpenAI's GPT model.

## Pipeline
### Pre-processing
1. **Source**  
   Legal texts are sourced from the English translation of the Swiss Civil Code via the [Official Swiss Federal Law Database](https://www.fedlex.admin.ch/eli/cc/24/233_245_233/en).

2. **Data Extraction**  
   Articles are extracted and converted into a structured CSV format using a combination of manual and LLM parsing.

3. **Embedding Generation**  
   Each article is embedded using `Xenova/paraphrase-MiniLM-L6-v2`, producing 384-dimensional vectors.

---

### Runtime Flow

1. **User Input**  
   A legal question is entered through the app interface.

2. **Initial GPT Response**  
   The question is passed to OpenAI’s API to generate a *raw* legal-style answer.

3. **Question Embedding**  
   The generated response is embedded using `Xenova/paraphrase-MiniLM-L6-v2`.

4. **Similarity Search**  
   Cosine similarity is computed between the embedded answer and all article embeddings.

5. **Top-20 Retrieval**  
   The top 20 most relevant legal articles are selected based on similarity scores.

6. **Final GPT Query**  
   The original question and retrieved relevant articles are fed into a second OpenAI API call to generate the final answer.

7. **Response Output**  
   - Legal answer is returned, including proper citations.  
   - Top-20 articles displayed with their similarity score.


## Future Improvements

1. **Add Legal Structure to Embeddings**  
   Include each article’s part, section, and subsection when generating embeddings to give the model more context and improve relevance.

2. **Bring in Court Decisions**  
   Use Swiss court rulings as an additional knowledge source. These decisions often provide practical interpretations of the law and could make the answers more grounded and useful.

3. **Support Multiple Languages**  
   Work with the original legal texts in German, French, and Italian—the official and binding versions of the law.  
   Translate user questions into each language, run the same retrieval process, and combine the results.  
   This would also help with court decisions, which are often published in only one of the three languages.

## Tech Stack

- Next.js 14
- TypeScript
- OpenAI API
- Tailwind CSS

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key

## License

MIT
