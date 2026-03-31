import os

# Change this to your repository/folder path
folder_path = "G:/GitHub/mms_general"

for root, dirs, files in os.walk(folder_path):
    for file in files:
        print(os.path.join(root, file))
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    USER = "USER"
    ACCOUNTANT = "ACCOUNTANT"
    FEE_MANAGER = "FEE_MANAGER"
    PRINCIPAL = "PRINCIPAL"

# G:/GitHub/mms_general\router\dashboard.py         >>>>   ADMIN

# G:/GitHub/mms_general\router\students.py          >>>>   ADMIN / PRINCIPAL
# G:/GitHub/mms_general\router\users.py             >>>>   ADMIN
# G:/GitHub/mms_general\router\auth.py              >>>>   ADMIN
# G:/GitHub/mms_general\router\profile.py           >>>>   ADMIN / TEACHER / ACCOUNTANT / FEE_MANAGER / PRINCIPAL / USER
# G:/GitHub/mms_general\router\mark_attendance.py   >>>>   ADMIN / TEACHER / PRINCIPAL

# G:/GitHub/mms_general\router\expense.py           >>>>   ADMIN / ACCOUNTANT
# G:/GitHub/mms_general\router\income.py            >>>>   ADMIN / ACCOUNTANT
# G:/GitHub/mms_general\router\fee.py               >>>>   ADMIN / FEE_MANAGER

# G:/GitHub/mms_general\router\class_names.py       >>>>   ADMIN / PRINCIPAL
# G:/GitHub/mms_general\router\expense_cat_names.py >>>>   ADMIN / PRINCIPAL
# G:/GitHub/mms_general\router\income_cat_names.py  >>>>   ADMIN / PRINCIPAL
# G:/GitHub/mms_general\router\teacher_names.py     >>>>   ADMIN / PRINCIPAL



# G:/GitHub/mms_general\router\dashboard.py         

# G:/GitHub/mms_general\router\students.py          
# G:/GitHub/mms_general\router\users.py             
# G:/GitHub/mms_general\router\profile.py           
# G:/GitHub/mms_general\router\mark_attendance.py   

# G:/GitHub/mms_general\router\expense.py           
# G:/GitHub/mms_general\router\income.py            
# G:/GitHub/mms_general\router\fee.py               

# G:/GitHub/mms_general\router\class_names.py       
# G:/GitHub/mms_general\router\expense_cat_names.py 
# G:/GitHub/mms_general\router\income_cat_names.py  
# G:/GitHub/mms_general\router\teacher_names.py     