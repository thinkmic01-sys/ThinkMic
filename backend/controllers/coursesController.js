const Course = require('../models/Course');

// In a real app this would fetch real courses, but since it's an MVP
// we can seed initial courses if DB is empty or just return the static list from DB.

exports.getCourses = async (req, res) => {
    try {
        let courses = await Course.find();
        
        // Seed mock courses if none exist in DB (for MVP demo purposes)
        if (courses.length === 0) {
            const seedCourses = [
                {
                    status: 'UPCOMING', tag: 'Methodology', time: 'Tomorrow, 10:00 AM',
                    title: 'Structuring Qualitative Data for AI Analysis',
                    desc: 'Learn best practices for preparing interview transcripts and field notes for ingestion into specialized LLMs.',
                    host: 'Dr. E. Chen', hostTitle: 'Lead Qualitative Researcher',
                    img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600',
                    bullets: ['Data cleaning techniques for messy transcripts.', 'Prompt engineering for thematic extraction.', 'Bias detection in AI analysis.']
                },
                {
                    status: 'RECORDED', tag: 'Historical Studies', time: '45:20',
                    title: 'Digitizing the Archives: AI in Historiography',
                    desc: 'A case study on using computer vision to transcribe and categorize 18th-century mercantile records.',
                    host: 'Prof. M. Rossi', hostTitle: 'Professor of Digital History',
                    img: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600',
                    bullets: ['Setting up OCR pipelines for handwritten documents.', 'Training custom vision models on historical scripts.', 'Archival metadata structuring.']
                },
                {
                    status: 'LIVE', tag: 'Quantum Computing', time: '342 watching',
                    title: 'Quantum Neural Networks: A Primer',
                    desc: 'Live Q&A session discussing the theoretical limits and current practical applications of QNNs.',
                    host: 'Dr. K. Sato', hostTitle: 'Senior Quantum Engineer',
                    img: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600',
                    bullets: ['Qubit state mapping for neural pathways.', 'Error correction in quantum environments.', 'Current hardware limitations.']
                }
            ];
            await Course.insertMany(seedCourses);
            courses = await Course.find();
        }

        res.status(200).json(courses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });
        res.status(200).json(course);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
