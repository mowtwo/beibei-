<script lang="ts">
  import Zip from "jszip";
  import { useLocalStorage } from "./hooks/useLocalStorage";

  const zip = new Zip();

  interface Question<Answer> {
    type: string;
    content: string;
    answer: Answer;
  }

  interface ChoiceQuestion<Single extends boolean, Options extends string[]>
    extends Question<
      Single extends true ? Options[number] : Options[number][]
    > {
    options: Record<Options[number], string>;
  }

  type ChoiceOptionNames = ["A", "B", "C", "D"];

  interface SingleChoiceQuestion
    extends ChoiceQuestion<true, ChoiceOptionNames> {
    type: "单选题";
  }

  interface MultipleChoiceQuestion
    extends ChoiceQuestion<false, ChoiceOptionNames> {
    type: "多选题";
  }

  interface JudgmentQuestion extends Question<0 | 1> {
    type: "判断题";
  }

  type QuestionAnswer =
    | SingleChoiceQuestion
    | MultipleChoiceQuestion
    | JudgmentQuestion;

  let fromText = "";
  let fromJSON: any = [];
  let fileName = "";

  const handleConvert = () => {
    const lines = fromText.split("\n").map((item) => item.trim());
    const questionAnswerList = Array<QuestionAnswer>();
    let currentItem: Partial<QuestionAnswer> = {};
    for (const line of lines) {
      if (line.startsWith("【")) {
        const slice_1 = line.slice(1);
        if (slice_1.startsWith("答案")) {
          if (currentItem.type == "判断题") {
            currentItem.answer = slice_1.includes("对") ? 1 : 0;
          } else {
            if (currentItem.type == "单选题") {
              // @ts-ignore
              currentItem.answer = slice_1.slice(3).trim();
            } else {
              // @ts-ignore
              currentItem.answer = slice_1.slice(3).trim().split("");
            }
          }
          questionAnswerList.push(currentItem as QuestionAnswer);
          currentItem = {};
          continue;
        }
        if (
          ["判断题", "单选题", "多选题"].some((item) =>
            slice_1.startsWith(item)
          )
        ) {
          // @ts-ignore
          currentItem.type = slice_1.slice(0, 3);
          currentItem.content = slice_1.slice(4).trim();
          if (!slice_1.startsWith("判断题")) {
            (
              currentItem as SingleChoiceQuestion | MultipleChoiceQuestion
            ).options = {
              A: "",
              B: "",
              C: "",
              D: "",
            };
          }
          continue;
        }
      }
      if (["A", "B", "C", "D"].some((item) => line.startsWith(`${item}.`))) {
        (currentItem as SingleChoiceQuestion | MultipleChoiceQuestion).options[
          line[0]
        ] = line.slice(2);
      }
    }
    fromJSON = questionAnswerList;
  };

  const domParser = new DOMParser();
  const list = useLocalStorage("_bbjList", "[]");

  const readDocx = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const [file] = input.files;
    if (file) {
      var docxZip = await zip.loadAsync(file);
      docxZip.forEach(async (path, entry) => {
        if (entry.name === "word/document.xml") {
          const data = await zip.file(path).async("string");
          const r = domParser.parseFromString(data, "text/xml");
          fileName = file.name;
          fromText = Array.from(
            r.getElementsByTagName("w:body")[0].getElementsByTagName("w:p")
          )
            .map((item) => item.getElementsByTagName("w:r"))
            .map((r) => {
              let line = "";
              const rows = Array.from(r);
              for (const row of rows) {
                const hasBr =
                  Array.from(row.getElementsByTagName("w:br")).length > 0;
                if (hasBr) {
                  line += "\n";
                } else {
                  line += Array.from(row.getElementsByTagName("w:t"))
                    .map((t) => t.textContent)
                    .join("");
                }
              }
              return line;
            })
            .join("\n");
        }
      });
    }
  };

  let selectedItem: any;
  let selectedItemPos = 0;

  $: selectedItemCurrentItem = selectedItem?.[selectedItemPos];

  const resetPos = () => {
    selectedItemPos = 0;
  };

  $: {
    if (selectedItem?.fileName) {
      resetPos();
    }
  }

  const memoUserAnswer = (answer: any) => {
    selectedItem[selectedItemPos].memo = answer;
  };

  const submitAnswer = (answer: any) => {
    selectedItem[selectedItemPos].userAnswer = answer;
  };
</script>

{#if !selectedItem}
  <div>
    <input on:change={readDocx} type="file" accept=".docx" />读取docx
    <hr />
    <textarea value={fromText} rows="10" cols="40" readonly />
    <hr />
    <button on:click={handleConvert} disabled={!fromText || !fileName}
      >转换JSON</button
    >
    <hr />
    <textarea
      value={JSON.stringify(fromJSON, null, 2)}
      rows="10"
      cols="40"
      readonly
    />
    <hr />
    <button
      on:click={() => {
        $list = JSON.stringify([
          ...JSON.parse($list),
          {
            fileName,
            content: JSON.stringify(fromJSON),
          },
        ]);
      }}
      disabled={!fileName || !fromJSON || fromJSON.length == 0}
      >保存到知识 {fileName}</button
    >
    <hr />
    {#each JSON.parse($list) as item}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        style="text-decoration: underline; color:darkcyan"
        on:click={() => {
          selectedItem = JSON.parse(item.content);
        }}
      >
        {item.fileName}
        <button
          on:click|stopPropagation={() => {
            const l = JSON.parse($list);
            const i = l.findIndex((fi) => fi.fileName == item.fileName);
            l.splice(i, 1);
            $list = JSON.stringify(l);
          }}>删除</button
        >
      </div>
    {/each}
  </div>
{:else if selectedItemCurrentItem}
  <button on:click={() => (selectedItem = undefined)}>退出</button>
  <hr />
  <div>
    <span>【{selectedItemCurrentItem.type}】</span>
    {selectedItemCurrentItem.content}
  </div>
  {#if selectedItemCurrentItem.type == "判断题"}
    <ul>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <li
        on:click={() => {
          submitAnswer(1);
        }}
        style={selectedItemCurrentItem.userAnswer == 1
          ? selectedItemCurrentItem.userAnswer == selectedItemCurrentItem.answer
            ? "color:blue"
            : "color:red"
          : ""}
      >
        对
      </li>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <li
        on:click={() => {
          submitAnswer(0);
        }}
        style={selectedItemCurrentItem.userAnswer == 0
          ? selectedItemCurrentItem.userAnswer == selectedItemCurrentItem.answer
            ? "color:blue"
            : "color:red"
          : ""}
      >
        错
      </li>
    </ul>
  {:else if selectedItemCurrentItem.type == "单选题"}
    <ul>
      {#each Object.entries(selectedItemCurrentItem.options) as [name, value]}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <li
          on:click={() => {
            submitAnswer(name);
          }}
          style={selectedItemCurrentItem.userAnswer == name
            ? selectedItemCurrentItem.userAnswer ==
              selectedItemCurrentItem.answer
              ? "color:blue"
              : "color:red"
            : ""}
        >
          {name}.{value}
        </li>
      {/each}
    </ul>
  {:else}
    <ul>
      {#each Object.entries(selectedItemCurrentItem.options) as [name, value]}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <li
          on:click={() => {
            const set = selectedItemCurrentItem.memo ?? new Set();
            set.add(name);
            memoUserAnswer(set);
          }}
          style={selectedItemCurrentItem.userAnswer == name
            ? selectedItemCurrentItem.userAnswer.sort().join("") ==
              selectedItemCurrentItem.answer.sort().join()
              ? "color:blue"
              : "color:red"
            : ""}
        >
          {name}.{value}
        </li>
      {/each}
    </ul>
    <button
      on:click={() => {
        submitAnswer(Array.from(selectedItemCurrentItem.memo).sort());
      }}>提交答案</button
    >
  {/if}
  <div>
    <button
      on:click={() => {
        if (selectedItemPos > 0) {
          selectedItemPos--;
        }
      }}>上一题</button
    >
    <button
      on:click={() => {
        if (selectedItemPos < selectedItem.length - 1) {
          selectedItemPos++;
        }
      }}>下一题</button
    >
  </div>
{/if}
