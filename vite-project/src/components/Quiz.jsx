import { useEffect, useMemo, useState } from "react";

const labels = ["A", "B", "C", "D"];
const difficultyOrder = ["Easy", "Medium", "Hard"];

function Quiz() {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState("All subjects");
  const [topicFilter, setTopicFilter] = useState("All topics");
  const [loadingError, setLoadingError] = useState("");

  useEffect(() => {
    fetch("/mcq.json")
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load questions");
        return response.json();
      })
      .then((data) => setQuestions(data))
      .catch(() => setLoadingError("We couldn't load the question bank. Please refresh and try again."));
  }, []);

  const subjects = [...new Set(questions.map((item) => item.module))];
  const allTopics = [...new Set(questions.map((item) => item.topic))];
  const availableTopics = [...new Set(questions
    .filter((item) => subjectFilter === "All subjects" || item.module === subjectFilter)
    .map((item) => item.topic))];
  const filteredQuestions = questions.filter((item) => (
    (subjectFilter === "All subjects" || item.module === subjectFilter)
    && (topicFilter === "All topics" || item.topic === topicFilter)
  ));
  const question = filteredQuestions[current] ?? filteredQuestions[0];
  const completedAnswers = useMemo(
    () => Object.values(answers).filter((answer) => answer.submitted),
    [answers],
  );
  const score = completedAnswers.filter((answer) => answer.correct).length;
  const completedIds = new Set(
    completedAnswers.map((answer) => answer.questionId),
  );
  const wrongIds = new Set(
    completedAnswers.filter((answer) => !answer.correct).map((answer) => answer.questionId),
  );
  const coveredTopics = new Set(
    completedAnswers.map((answer) => answer.topic),
  );
  const difficultyStats = difficultyOrder.map((difficulty) => {
    const total = questions.filter((item) => item.difficulty === difficulty).length;
    const completed = completedAnswers.filter(
      (answer) => answer.difficulty === difficulty,
    ).length;
    return { difficulty, total, completed };
  });
  const topicStats = allTopics;

  if (loadingError) return <main className="status-screen"><p>{loadingError}</p></main>;
  if (!questions.length) return <main className="status-screen"><p>Loading your question bank...</p></main>;

  function goToQuestion(index) {
    setCurrent(index);
    setSelected(answers[filteredQuestions[index].id]?.selected ?? null);
  }

  function changeSubject(value) {
    setSubjectFilter(value);
    setTopicFilter("All topics");
    setCurrent(0);
    setSelected(null);
  }

  function changeTopic(value) {
    setTopicFilter(value);
    setCurrent(0);
    setSelected(null);
  }

  function submitAnswer() {
    if (!selected || !question) return;
    setAnswers((previous) => ({
      ...previous,
      [question.id]: {
        questionId: question.id,
        selected,
        submitted: true,
        correct: selected === question.answer,
        difficulty: question.difficulty,
        topic: question.topic,
      },
    }));
  }

  function resetQuiz() {
    setAnswers({});
    setCurrent(0);
    setSelected(null);
    setSubjectFilter("All subjects");
    setTopicFilter("All topics");
  }

  const currentAnswer = answers[question.id];
  const isSubmitted = Boolean(currentAnswer?.submitted);
  const progress = Math.round((completedAnswers.length / questions.length) * 100);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">PLACEMENT PRACTICE</p>
          <h1>Build your interview confidence.</h1>
          <p className="header-copy">Work through curated questions, track your strengths, and keep moving forward.</p>
        </div>
        <button className="reset-button" onClick={resetQuiz}>Reset progress</button>
      </header>

      <section className="progress-overview" aria-label="Quiz progress overview">
        <div className="progress-card progress-card-main">
          <div className="progress-card-heading">
            <span>Overall progress</span>
            <strong>{progress}%</strong>
          </div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <p>{completedAnswers.length} of {questions.length} questions completed</p>
        </div>
        <div className="metric-card"><span className="metric-icon purple">✓</span><div><strong>{score}</strong><span>Correct answers</span></div></div>
        <div className="metric-card"><span className="metric-icon green">◉</span><div><strong>{coveredTopics.size}</strong><span>Topics covered</span></div></div>
      </section>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="section-title"><span>Find a question</span></div>
            <div className="filters">
              <label>Subject
                <select value={subjectFilter} onChange={(event) => changeSubject(event.target.value)}>
                  <option>All subjects</option>
                  {subjects.map((subject) => <option key={subject}>{subject}</option>)}
                </select>
              </label>
              <label>Topic
                <select value={topicFilter} onChange={(event) => changeTopic(event.target.value)}>
                  <option>All topics</option>
                  {availableTopics.map((topic) => <option key={topic}>{topic}</option>)}
                </select>
              </label>
            </div>
            <div className="section-title navigator-title"><span>Question navigator</span><span>{filteredQuestions.length} shown</span></div>
            <div className="question-grid">
              {filteredQuestions.map((item, index) => (
                <button
                  key={item.id}
                  className={`question-number ${index === current ? "active" : ""} ${completedIds.has(item.id) ? "done" : ""} ${wrongIds.has(item.id) ? "wrong" : ""}`}
                  onClick={() => goToQuestion(index)}
                  aria-label={`Go to question ${index + 1}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <div className="legend"><span><i className="legend-dot done-dot" />Completed</span><span><i className="legend-dot wrong-dot" />Wrong — revisit</span><span><i className="legend-dot" />Remaining</span></div>
          </div>
          <div className="sidebar-section topic-section">
            <div className="section-title"><span>Topics covered</span><span>{coveredTopics.size}/{topicStats.length}</span></div>
            <div className="topic-list">
              {topicStats.map((topic) => (
                <div className={`topic-row ${coveredTopics.has(topic) ? "covered" : ""}`} key={topic}>
                  <span>{coveredTopics.has(topic) ? "✓" : "○"}</span><p>{topic}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="quiz-panel">
          <div className="question-meta">
            <span className={`difficulty-badge ${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
            <span className="question-count">Question {current + 1} <b>/</b> {filteredQuestions.length}</span>
          </div>
          <p className="module-label">{question.module}</p>
          <h2>{question.question}</h2>
          <div className="answer-list">
            {question.options.map((option, index) => {
              const label = labels[index];
              const isCorrect = isSubmitted && label === question.answer;
              const isWrong = isSubmitted && label === selected && label !== question.answer;
              return (
                <button
                  key={label}
                  className={`answer-option ${selected === label ? "selected" : ""} ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
                  disabled={isSubmitted}
                  onClick={() => setSelected(label)}
                >
                  <span className="option-label">{label}</span><span>{option}</span>
                  {isCorrect && <span className="answer-mark">✓</span>}
                  {isWrong && <span className="answer-mark">×</span>}
                </button>
              );
            })}
          </div>
          {isSubmitted && (
            <div className={`feedback ${currentAnswer.correct ? "feedback-success" : "feedback-danger"}`}>
              <strong>{currentAnswer.correct ? "Correct answer" : "Not quite this time"}</strong>
              <p>{question.explanation}</p>
            </div>
          )}
          <div className="question-actions">
            {!isSubmitted ? (
              <button className="primary-button" disabled={!selected} onClick={submitAnswer}>Check answer <span>→</span></button>
            ) : (
              <button className="primary-button" onClick={() => goToQuestion((current + 1) % questions.length)}>Next question <span>→</span></button>
            )}
          </div>
        </section>

        <aside className="difficulty-panel">
          <div className="section-title"><span>Difficulty progress</span></div>
          {difficultyStats.map(({ difficulty, total, completed }) => {
            const percentage = total ? Math.round((completed / total) * 100) : 0;
            return (
              <div className="difficulty-row" key={difficulty}>
                <div><span className={`difficulty-dot ${difficulty.toLowerCase()}`} /><strong>{difficulty}</strong><span className="difficulty-count">{completed}/{total}</span></div>
                <div className="mini-track"><span className={difficulty.toLowerCase()} style={{ width: `${percentage}%` }} /></div>
              </div>
            );
          })}
          <div className="tip-card"><span>✦</span><div><strong>Keep going!</strong><p>Complete a few more questions to see your progress grow.</p></div></div>
        </aside>
      </div>
    </main>
  );
}

export default Quiz;
