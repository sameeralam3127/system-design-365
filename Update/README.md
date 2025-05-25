
# 🔧 Ansible Patch Report Automation

Automate patch updates and generate reports for **RHEL**, **Ubuntu**, and **SUSE** systems using Ansible. Reports are saved both on the remote system and pulled back to the control node. Each report is also posted to a Slack channel!

---

## 📁 Project Structure

```
ansible-patch-report/
├── ansible.cfg
├── inventory/
│   └── production
├── group_vars/
│   ├── all.yml
│   └── rhel.yml
├── patch-report.yml
├── roles/
│   └── patching/
│       ├── tasks/
│       ├── templates/
│       │   └── patch_report.j2
├── reports/
```

---

## 🚀 Features

- 🛠️ Applies patches based on detected OS (RHEL, Ubuntu, SUSE)
- 📄 Generates system-specific patch reports
- 📤 Pulls reports back to the control node (`./reports/`)
- 📢 Sends patch reports to a Slack channel
- 💡 Clean YAML and variable separation

---

## 🔧 Prerequisites

- Ansible installed on control node
- `sshpass` installed (for password-based auth)
- Remote systems accessible via SSH
- Slack Incoming Webhook URL (optional but recommended)

---

## 🗂️ Inventory Example: `inventory/production`

```ini
[rhel]
rhel-node-1 ansible_host=172.16.175.129

[ubuntu]
ubuntu-node-1 ansible_host=192.168.1.110

[suse]
suse-node-1 ansible_host=192.168.1.120

[all:vars]
ansible_user=root
ansible_ssh_pass=
ansible_become=true
ansible_become_method=sudo
ansible_become_user=root
ansible_become_pass=
```

---

## 🔐 Group Variables Example: `group_vars/all.yml`

```yaml
slack_webhook_url: "https://hooks.slack.com/services/XXXX/XXXX/XXXX"
```

---

## 📝 How to Run

```bash
cd ansible-patch-report
ansible-playbook patch-report.yml
```

---

## 📬 Example Slack Output

> **Patch Report for rhel-node-1**
> ```
> Generated On: 2025-04-10 at 23:42:00
> No package updates are available. System is fully patched.
> ```

---

## 🛡️ Security Best Practices

- Switch to SSH key-based auth for production
- Store secrets using Ansible Vault
- Audit and rotate credentials regularly

---

## 💡 To Do

- [ ] Add Molecule testing for roles
- [ ] Add OS-specific handlers
- [ ] Add HTML version of the report

---

## 🧠 Author

Sameer Alam 💻  
Maintained with love and YAML ❤️

```
